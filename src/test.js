import React, { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";

const JsonForm = () => {
  const [
    openEditPresentationDefinitionModal,
    setOpenEditPresentationDefinitionModal,
  ] = useState(false);
  const [error, setError] = useState(null);

  const { control, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      fields: [],
      limitDisclosure: false,
      credentialFormat: true,
      typeCheck: "",
      typeFilter: null,
      mdocPrefix: "",
      presentationDefinition: JSON.stringify(
        {
          constraints: {
            fields: [],
          },
        },
        null,
        2
      ),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "fields",
  });

  const watchFields = watch("fields");
  const watchPresentationDefinition = watch("presentationDefinition");
  const watchTypeCheck = watch("typeCheck");
  const watchTypeFilter = watch("typeFilter");
  const watchCredentialFormat = watch("credentialFormat");
  const watchMdocPrefix = watch("mdocPrefix");



  const updateJsonFromFields = React.useCallback(() => {
    const updatedJson = {
      constraints: {
        fields: [],
      },
    };

    if (watchCredentialFormat !== "mso_mdoc") {
      // Add type field first if typeCheck already set
      if (watchTypeCheck) {
        if (watchCredentialFormat === "jwt") {
          updatedJson.constraints.fields.push({
            path: watchTypeCheck.split(",").map((p) => p.trim()),
            ...(watchTypeFilter && {
              filter: {
                type: "array",
                contains: { const: watchTypeFilter },
              },
            }),
          });
        } else {
          // for sd-jwt
          updatedJson.constraints.fields.push({
            path: watchTypeCheck.split(",").map((p) => p.trim()),
            ...(watchTypeFilter && {
              filter: {
                type: "string",
                const: watchTypeFilter,
              },
            }),
          });
        }
      } else {
        if (watchCredentialFormat === "jwt") {
          updatedJson.constraints.fields.push({
            path: ["$.type"],
            filter: {
              type: "array",
              contains: { const: watchTypeFilter },
            },
          });
        } else {
          updatedJson.constraints.fields.push({
            path: ["$.vct"],
            filter: {
              type: "string",
              const: watchTypeFilter,
            },
          });
        }
      }
    }

    // Add other fields
    updatedJson.constraints.fields.push(
      ...watchFields
        .filter(
          (field) =>
            !field?.isHidden &&
            !field?.path?.includes("$.type") &&
            !field?.path?.includes("$.vct")
        )
        .map((field) => {
          const fieldData = {
            path: field?.path
              ?.split(",")
              .map((p) =>
                watchCredentialFormat === "mso_mdoc"
                  ? field.hasPrefix
                    ? `$['${watchMdocPrefix}']['${p.trim()}']`
                    : p.trim()
                  : field.hasPrefix
                    ? watchCredentialFormat === "jwt"
                      ? `$.credentialSubject.${p.trim()}`
                      : `$.${p.trim()}`
                    : p.trim()
              ),
          };

          if (field.filter) {
            fieldData.filter = field.filter;
          }
          return fieldData;
        })
    );

    if (watchCredentialFormat !== "jwt") {
      updatedJson.constraints.limit_disclosure = "required";
    }

    setValue("presentationDefinition", JSON.stringify(updatedJson, null, 2));
  }, [
    watchFields,
    watchCredentialFormat,
    watchTypeCheck,
    watchTypeFilter,
    setValue,
  ]);

  useEffect(() => {
    updateJsonFromFields();
  }, [updateJsonFromFields]);

  const handlePresentationDefinitionChange = (value) => {
    setValue("presentationDefinition", value, {
      shouldDirty: true,
    });

    try {
      const parsedJson = JSON.parse(value);

      const typeField = parsedJson.constraints.fields.find(
        (field) => field.path.includes("$.type") || field.path.includes("$.vct")
      );
      if (typeField) {
        setValue("typeCheck", typeField.path.join(", "));
        if (
          typeField.filter &&
          typeField.filter.contains &&
          typeField.filter.contains.const
        ) {
          // for jwt
          setValue("typeFilter", typeField.filter.contains.const);
        } else if (typeField.filter && typeField.filter.const) {
          // for sd-jwt
          setValue("typeFilter", typeField.filter.const);
        } else {
          // for mdoc
          setValue("typeFilter", "");
        }
      } else {
        setValue("typeCheck", "");
        setValue("typeFilter", "");
      }
    } catch (error) {
      setError("Invalid JSON");
    }
  };

  const getPrefixForMdoc = (data) => {
    const firstPath = data.fields[0].path[0];

    // Extract the first array value inside the string
    const match = firstPath.match(/\['([^']+)'\]/);
    const firstArrayValue = match ? match[1] : null;

    return firstArrayValue;
  };

  const handleModalClose = (
    presentationDefinitionValue,
    setValue,
    watchFields,
    error,
    setOpenEditPresentationDefinitionModal,
    setOpenSnackBar,
    setIsValidJson,
    setError,
    watchCredentialFormat
  ) => {
    try {
      const parsedJson = JSON.parse(presentationDefinitionValue);
      setValue("mdocPrefix", getPrefixForMdoc(parsedJson.constraints));
      const mdocPrefixValue = getPrefixForMdoc(parsedJson.constraints);

      // Extract type field
      const typeField = parsedJson.constraints.fields.find(
        (field) => field.path.includes("$.type") || field.path.includes("$.vct")
      );
      if (typeField) {
        setValue("typeCheck", typeField.path.join(", "));
        if (
          typeField.filter &&
          typeField.filter.contains &&
          typeField.filter.contains.const
        ) {
          // for jwt
          setValue("typeFilter", typeField.filter.contains.const);
        } else if (typeField.filter && typeField.filter.const) {
          // for sd-jwt
          setValue("typeFilter", typeField.filter.const);
        } else {
          // for mdoc
          setValue("typeFilter", "");
        }
      } else {
        setValue("typeCheck", "");
        setValue("typeFilter", "");
      }

      const stripePath = (path, mdocPrefixValue) => {
        if (watchCredentialFormat === "mso_mdoc") {
          // Use a regular expression to match the pattern and extract the dynamic value
          const match = path.match(/\$\['(.*?)'\]\['(.*)'\]$/);

          if (match && match[1].startsWith(mdocPrefixValue)) {
            // If it matches the expected pattern and starts with mdocPrefixValue,
            // return the second captured group (the dynamic value)
            return match[2];
          }
        } else if (watchCredentialFormat === "jwt") {
          return path.replace(/^\$\.credentialSubject\./, "");
        } else {
          return path.replace(/^\$\./, "");
        }
      };

      const updatedFields = watchFields
        .map((existingField) => {
          const matchingField = parsedJson.constraints.fields.find((f) =>
            f.path.some(
              (p) => stripePath(p, mdocPrefixValue) === existingField.path
            )
          );

          if (matchingField) {
            return {
              ...existingField,
              filter: matchingField.filter,
              hasPrefix:
                watchCredentialFormat === "mso_mdoc"
                  ? matchingField.path.some((p) => p.startsWith("$['"))
                  : matchingField.path.some(
                      (p) =>
                        p.startsWith("$.credentialSubject.") ||
                        p.startsWith("$.")
                    ),
              isHidden: existingField.isHidden, // Preserve the hidden state
            };
          } else if (existingField.isHidden) {
            // Keep hidden fields even if they're not in the JSON
            return existingField;
          } else {
            // Field is not in JSON and not hidden, so we'll remove it
            return null;
          }
        })
        .filter((field) => field !== null);

      // Add new fields from the modal that weren't in the existing state
      parsedJson.constraints.fields.forEach((field) => {
        if (
          (field.path[0] !== "$.type" || field.path[0] !== "$.vct") &&
          !updatedFields.some(
            (f) => f.path === stripePath(field.path[0], mdocPrefixValue)
          )
        ) {
          updatedFields.push({
            path: stripePath(field.path[0], mdocPrefixValue),
            hasPrefix:
              watchCredentialFormat === "mso_mdoc"
                ? field.path[0].startsWith("$['")
                : watchCredentialFormat === "jwt"
                ? field.path[0].startsWith("$.credentialSubject.")
                : field.path[0].startsWith("$."),
            isHidden: false,
            filter: field.filter,
          });
        }
      });

      // Add new fields from JSON that weren't in the existing fields
      parsedJson.constraints.fields.forEach((field) => {
        if (!field.path.includes("$.type")) {
          const path = field.path.map(stripePath).join(", ");
          const existingField = updatedFields.find((f) => f.path === path);
          if (!existingField) {
            updatedFields.push({
              path,
              hasPrefix: watchCredentialFormat
                ? field.path.some((p) => p.startsWith("$['"))
                : field.path.some((p) => p.startsWith("$.credentialSubject.")),
              isHidden: false,
              filter: field.filter,
            });
          }
        }
      });

      setValue(
        "fields",
        updatedFields.filter((field) => field.filter === undefined)
      );

      const hasLimitDisclosure =
        parsedJson.constraints &&
        parsedJson.constraints.limit_disclosure === "required";
      setValue("limitDisclosure", hasLimitDisclosure);
    } catch (error) {
      // Error handling remains the same
    }

    if (error !== "") {
      if (error === "Array does not contain required item. at line number 3") {
        setError(
          "Presentation Definition must contain a field with path '$.type'"
        );
        setOpenSnackBar(true);
        setIsValidJson(false);
      } else {
        setOpenSnackBar(true);
        setIsValidJson(false);
      }
    } else {
      setIsValidJson(true);
    }
    setOpenEditPresentationDefinitionModal(false);
  };

  const handleAddField = () => {
    append({ path: "", hasPrefix: true, isHidden: false });
  };

  const onSubmit = (data) => {
    updateJsonFromFields();
    console.log(
      "Submitted Presentation Definition:",
      watch("presentationDefinition")
    );
  };

  return (
    <div style={{ padding: "16px" }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ marginBottom: "16px" }}>
          <Controller
            name="limitDisclosure"
            control={control}
            render={({ field: { value, onChange } }) => (
              <label>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={onChange}
                  style={{ marginRight: "8px" }}
                />
                Limit Disclosure
              </label>
            )}
          />
        </div>

        {fields.map((field, index) => (
          <div
            key={field.id}
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <Controller
              name={`fields.${index}.isHidden`}
              control={control}
              render={({ field: { value, onChange } }) => (
                <input
                  type="checkbox"
                  checked={!value}
                  onChange={() => onChange(!value)}
                  style={{ marginRight: "8px" }}
                />
              )}
            />
            <Controller
              name={`fields.${index}.path`}
              control={control}
              render={({ field: { value, onChange } }) => (
                <input
                  type="text"
                  value={value}
                  onChange={onChange}
                  placeholder="e.g. name, address.street, phone"
                  style={{ marginRight: "8px", padding: "4px", flexGrow: 1 }}
                />
              )}
            />
            <button
              type="button"
              onClick={() => remove(index)}
              style={{ padding: "4px 8px" }}
            >
              Remove
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddField}
          style={{ marginBottom: "16px", padding: "8px 16px" }}
        >
          Add Field
        </button>

        <button
          type="button"
          onClick={() => {
            updateJsonFromFields();
            setOpenEditPresentationDefinitionModal(true);
          }}
          style={{ padding: "8px 16px", marginRight: "16px" }}
        >
          Open Presentation Definition
        </button>

        <button type="submit" style={{ padding: "8px 16px" }}>
          Submit
        </button>

        {error && (
          <div style={{ color: "red", marginTop: "16px" }}>Error: {error}</div>
        )}
      </form>

      {openEditPresentationDefinitionModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "5px",
              width: "80%",
              maxWidth: "600px",
            }}
          >
            <h2>Edit Presentation Definition</h2>
            <div style={{ marginBottom: "16px" }}>
              <label>
                Type Check Path(s):
                <Controller
                  name="typeFilter"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="e.g. $.type, $.credentialSubject.type"
                      style={{
                        marginLeft: "8px",
                        padding: "4px",
                        width: "300px",
                      }}
                    />
                  )}
                />
              </label>
            </div>

            <textarea
              value={watchPresentationDefinition}
              onChange={handlePresentationDefinitionChange}
              style={{ width: "100%", height: "200px", marginBottom: "10px" }}
            />
            {error && (
              <div style={{ color: "red", marginBottom: "10px" }}>
                Error: {error}
              </div>
            )}
            <div>
              <button
                onClick={() => setOpenEditPresentationDefinitionModal(false)}
                style={{ marginRight: "10px" }}
              >
                Cancel
              </button>
              <button onClick={handleModalClose}>Close and Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JsonForm;
