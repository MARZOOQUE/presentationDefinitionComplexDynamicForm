import React, { useEffect, useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import debounce from "lodash.debounce";

let defaultValue = {
  presentationDefinition: "",
  presentationDropdown: "",
  selectedVerificationFormat: "",
  label: "",
  fields: [],
};

const JsonForm = () => {
  const { register, control, handleSubmit, setValue, watch, resetField } =
    useForm({
      mode: "onChange",
      defaultValues: {
        ...defaultValue,
      },
    });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "fields",
  });

  const presentationDefinitionValue = watch("presentationDefinition");
  const [hiddenFields, setHiddenFields] = useState([]);
  const [localFieldValues, setLocalFieldValues] = useState({});

  useEffect(() => {
    if (presentationDefinitionValue) {
      resetField("fields");
      setHiddenFields([]);
      setLocalFieldValues({});

      try {
        const parsedJson = JSON.parse(presentationDefinitionValue);
        if (
          parsedJson &&
          parsedJson.constraints &&
          parsedJson.constraints.fields
        ) {
          const newFields = parsedJson.constraints.fields.map((field) => ({
            path: field.path[0],
          }));
          setValue("fields", newFields);
          const newLocalValues = newFields.reduce((acc, field, index) => {
            acc[index] = getDisplayValue(field.path);
            return acc;
          }, {});
          setLocalFieldValues(newLocalValues);
        }
      } catch (error) {
        console.error("Invalid JSON");
      }
    }
  }, [presentationDefinitionValue, resetField, setValue]);

  const handlePresentationDefinitionChange = (e) => {
    setValue("presentationDefinition", e.target.value);
  };

  const updateJsonValue = useCallback(
    debounce((updatedFields) => {
      try {
        const updatedJson = JSON.parse(presentationDefinitionValue);
        updatedFields.forEach((field, index) => {
          updatedJson.constraints.fields[index].path[0] = field.path;
        });
        setValue("presentationDefinition", JSON.stringify(updatedJson, null, 2));
      } catch (error) {
        console.error("Error updating JSON:", error);
      }
    }, 300),
    [presentationDefinitionValue, setValue]
  );

  const handleInputChangeForDataAttribute = (index, e) => {
    const newValue = e.target.value;
    setLocalFieldValues(prev => ({ ...prev, [index]: newValue }));
    
    const currentPath = fields[index].path;
    let updatedValue = newValue;
    
    if (currentPath.startsWith("$.credentialSubject.")) {
      updatedValue = "$.credentialSubject." + newValue;
    }
    
    setValue(`fields.${index}.path`, updatedValue);
    
    const updatedFields = fields.map((field, i) =>
      i === index ? { ...field, path: updatedValue } : field
    );
    
    updateJsonValue(updatedFields);
  };

  const handleRemoveAttribute = (index) => {
    remove(index);
    setLocalFieldValues(prev => {
      const newValues = { ...prev };
      delete newValues[index];
      return newValues;
    });
    const updatedJson = JSON.parse(presentationDefinitionValue);
    updatedJson.constraints.fields.splice(index, 1);
    setValue("presentationDefinition", JSON.stringify(updatedJson, null, 2));
  };

  const toggleFieldVisibility = (index) => {
    setHiddenFields((prevHiddenFields) =>
      prevHiddenFields.includes(index)
        ? prevHiddenFields.filter((i) => i !== index)
        : [...prevHiddenFields, index]
    );
  };

  const filteredPresentationDefinition = () => {
    if (!presentationDefinitionValue) return "";
    const parsedJson = JSON.parse(presentationDefinitionValue);
    const visibleFields = parsedJson.constraints.fields.filter(
      (_, index) => !hiddenFields.includes(index)
    );
    const visibleJson = {
      ...parsedJson,
      constraints: { fields: visibleFields },
    };
    return JSON.stringify(visibleJson, null, 2);
  };

  const getDisplayValue = (value) => {
    return value.startsWith("$.credentialSubject.")
      ? value.slice("$.credentialSubject.".length)
      : value;
  };

  return (
    <div>
      {fields.map((field, index) => (
        <div key={field.id}>
          <input
            value={localFieldValues[index] || ""}
            onChange={(e) => handleInputChangeForDataAttribute(index, e)}
            style={{ width: "500px" }}
          />
          <input
            type="checkbox"
            checked={!hiddenFields.includes(index)}
            onChange={() => toggleFieldVisibility(index)}
          />{" "}
          Show
          <button type="button" onClick={() => handleRemoveAttribute(index)}>
            Remove
          </button>
        </div>
      ))}

      <textarea
        onChange={handlePresentationDefinitionChange}
        value={filteredPresentationDefinition()}
        style={{ marginTop: "10px", width: "100%", minHeight: "100px" }}
      />

      <form onSubmit={handleSubmit()}>
        <button
          type="button"
          onClick={() => {
            if (
              !presentationDefinitionValue ||
              presentationDefinitionValue === ""
            ) {
              const defaultPresentationDefinition = {
                constraints: { fields: [{ path: [""] }] },
              };
              setValue(
                "presentationDefinition",
                JSON.stringify(defaultPresentationDefinition, null, 2)
              );
            } else {
              append({ path: "" });
              const updatedJson = JSON.parse(presentationDefinitionValue);
              updatedJson.constraints.fields.push({ path: [""] });
              setValue(
                "presentationDefinition",
                JSON.stringify(updatedJson, null, 2)
              );
            }
          }}
        >
          Add Field
        </button>

        <input type="submit" />
      </form>
    </div>
  );
};

export default JsonForm;