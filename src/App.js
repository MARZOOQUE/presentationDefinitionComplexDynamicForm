import React, { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";

const JsonForm = () => {
  const [openEditPresentationDefinitionModal, setOpenEditPresentationDefinitionModal] = useState(false);
  const [error, setError] = useState(null);

  const { control, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      fields: [],
      limitDisclosure: false,
      typeCheck: "",
      typeFilter: null,
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
  const watchTypeFilter = watch("typeFilter");

  const stripCredentialSubject = (value) => {
    return value.startsWith("$.credentialSubject.")
      ? value.slice("$.credentialSubject.".length)
      : value;
  };

  const updateJsonFromFields = useCallback(() => {
    const updatedJson = {
      constraints: {
        fields: [],
      },
    };

    // Add type field first if typeCheck is set
    if (watchTypeCheck) {
      updatedJson.constraints.fields.push({
        path: watchTypeCheck.split(',').map(p => p.trim()),
        ...(watchTypeFilter && { filter: watchTypeFilter }),
      });
    }

    // Add other fields
    updatedJson.constraints.fields.push(
      ...watchFields
        .filter((field) => !field.isHidden && !field.path.includes("$.type"))
        .map((field) => {
          const fieldData = {
            path: field.path.split(',').map(p => 
              field.hasPrefix ? `$.credentialSubject.${p.trim()}` : p.trim()
            ),
          };
          if (field.filter) {
            fieldData.filter = field.filter;
          }
          return fieldData;
        })
    );

    if (watchLimitDisclosure) {
      updatedJson.constraints.limit_disclosure = "required";
    }

    setValue("presentationDefinition", JSON.stringify(updatedJson, null, 2));
  }, [watchFields, watchLimitDisclosure, watchTypeCheck, watchTypeFilter, setValue]);

  useEffect(() => {
    updateJsonFromFields();
  }, [updateJsonFromFields]);

  const handlePresentationDefinitionChange = (e) => {
    setValue("presentationDefinition", e.target.value);
    setError(null);
  };



  const handleModalClose = () => {
    try {
      const parsedJson = JSON.parse(watchPresentationDefinition);

      // Extract type field
      const typeField = parsedJson.constraints.fields.find((field) => field.path.includes("$.type"));
      if (typeField) {
        setValue("typeCheck", typeField.path.join(', '));
        setValue("typeFilter", typeField.filter || null);
      } else {
        setValue("typeCheck", "");
        setValue("typeFilter", null);
      }

      // Process fields
      const updatedFields = watchFields.map(existingField => {
        const matchingField = parsedJson.constraints.fields.find(
          f => f.path.some(p => stripCredentialSubject(p) === existingField.path)
        );

        if (matchingField) {
          return {
            ...existingField,
            filter: matchingField.filter,
            hasPrefix: matchingField.path.some(p => p.startsWith("$.credentialSubject.")),
            isHidden: existingField.isHidden, // Preserve the hidden state
          };
        } else if (existingField.isHidden) {
          // Keep hidden fields even if they're not in the JSON
          return existingField;
        } else {
          // Field is not in JSON and not hidden, so we'll remove it
          return null;
        }
      }).filter(field => field !== null);

      // Add new fields from JSON that weren't in the existing fields
      parsedJson.constraints.fields.forEach(field => {
        if (!field.path.includes("$.type")) {
          const path = field.path.map(stripCredentialSubject).join(', ');
          const existingField = updatedFields.find(f => f.path === path);
          if (!existingField) {
            updatedFields.push({
              path,
              hasPrefix: field.path.some(p => p.startsWith("$.credentialSubject.")),
              isHidden: false,
              filter: field.filter,
            });
          }
        }
      });

      setValue("fields", updatedFields);

      const hasLimitDisclosure =
        parsedJson.constraints &&
        parsedJson.constraints.limit_disclosure === "required";
      setValue("limitDisclosure", hasLimitDisclosure);

     

      setOpenEditPresentationDefinitionModal(false);
    } catch (error) {
     
    }
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

        <div style={{ marginBottom: "16px" }}>
          <label>
            Type Check Path(s):
            <Controller
              name="typeCheck"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  placeholder="e.g. $.type, $.credentialSubject.type"
                  style={{ marginLeft: "8px", padding: "4px", width: "300px" }}
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