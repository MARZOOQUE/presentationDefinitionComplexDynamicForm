import React, { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";

const JsonForm = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);

  const { control, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      fields: [],
      limitDisclosure: false,
      typeCheck: "",
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
  const watchLimitDisclosure = watch("limitDisclosure");
  const watchPresentationDefinition = watch("presentationDefinition");
  const watchTypeCheck = watch("typeCheck");

  const stripCredentialSubject = (value) => {
    return value.startsWith("$.credentialSubject.")
      ? value.slice("$.credentialSubject.".length)
      : value;
  };

  const updateJsonFromFields = useCallback(() => {
    const updatedJson = {
      constraints: {
        fields: watchFields
          .filter((field) => !field.isHidden)
          .map((field) => {
            const fieldData = {
              path: [
                field.hasPrefix
                  ? `$.credentialSubject.${field.path}`
                  : field.path,
              ],
            };
            if (field.filter) {
              fieldData.filter = field.filter;
            }
            return fieldData;
          }),
      },
    };

    if (watchLimitDisclosure) {
      updatedJson.constraints.limit_disclosure = "required";
    }

    if (watchTypeCheck) {
      updatedJson.constraints.fields.push({ path: [watchTypeCheck] });
    }

    setValue("presentationDefinition", JSON.stringify(updatedJson, null, 2));
  }, [watchFields, watchLimitDisclosure, watchTypeCheck, setValue]);

  useEffect(() => {
    updateJsonFromFields();
  }, [updateJsonFromFields]);

  const handlePresentationDefinitionChange = (e) => {
    setValue("presentationDefinition", e.target.value);
    setError(null);
  };

  const validatePresentationDefinition = (parsedJson) => {
    if (!parsedJson.constraints || !parsedJson.constraints.fields) {
      throw new Error("Invalid JSON structure: missing constraints.fields");
    }

    const hasTypeField = parsedJson.constraints.fields.some(
      (field) => field.path && field.path.includes("$.type")
    );

    if (!hasTypeField) {
      throw new Error("Presentation Definition must contain a field with path '$.type'");
    }
  };

  const handleModalClose = () => {
    try {
      const parsedJson = JSON.parse(watchPresentationDefinition);
      validatePresentationDefinition(parsedJson);

      const updatedFields = parsedJson.constraints.fields.map((field) => {
        const path = field.path[0];
        const hasPrefix = path.startsWith("$.credentialSubject.");
        return {
          path: stripCredentialSubject(path),
          hasPrefix,
          isHidden: false,
          filter: field.filter,
        };
      });

      const typeField = updatedFields.find((field) => field.path === "$.type");
      if (typeField) {
        setValue("typeCheck", "$.type");
        updatedFields.splice(updatedFields.indexOf(typeField), 1);
      } else {
        setValue("typeCheck", "");
      }

      const mergedFields = watchFields
        .map((existingField) => {
          const updatedField = updatedFields.find(
            (f) => f.path === stripCredentialSubject(existingField.path)
          );
          if (updatedField) {
            return { ...existingField, ...updatedField };
          }
          return existingField.isHidden ? existingField : null;
        })
        .filter(Boolean);

      updatedFields.forEach((newField) => {
        if (!mergedFields.some((f) => f.path === newField.path)) {
          mergedFields.push(newField);
        }
      });

      setValue("fields", mergedFields);

      const hasLimitDisclosure =
        parsedJson.constraints &&
        parsedJson.constraints.limit_disclosure === "required";
      setValue("limitDisclosure", hasLimitDisclosure);

      setError(null);
      setIsModalOpen(false);
    } catch (error) {
      setError(error.message);
      setIsModalOpen(false);

    }
  };

  const handleAddField = () => {
    append({ path: "", hasPrefix: false, isHidden: false });
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

        <div style={{ marginBottom: "16px" }}>
          <label>
            Type Check Path:
            <Controller
              name="typeCheck"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  style={{ marginLeft: "8px", padding: "4px" }}
                />
              )}
            />
          </label>
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
            setIsModalOpen(true);
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

      {isModalOpen && (
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
                onClick={() => setIsModalOpen(false)}
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