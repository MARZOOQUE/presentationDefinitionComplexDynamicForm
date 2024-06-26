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

  useEffect(() => {
    if (presentationDefinitionValue) {
      resetField("fields");
      setHiddenFields([]);

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
      const updatedJson = JSON.parse(presentationDefinitionValue);
      updatedFields.forEach((field, index) => {
        updatedJson.constraints.fields[index].path[0] = field.path;
      });
      setValue("presentationDefinition", JSON.stringify(updatedJson, null, 2));
    }, 300),
    [presentationDefinitionValue, setValue]
  );

  const handleInputChangeForDataAttribute = (index, e) => {
    const value = e.target.value;
    setValue(`fields.${index}.path`, value);
    const updatedFields = fields.map((field, i) =>
      i === index ? { ...field, path: value } : field
    );
    updateJsonValue(updatedFields);
  };

  const handleRemoveAttribute = (index) => {
    remove(index);
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

  return (
    <div>
      {fields.length > 0 && (
        <div>
          <input
            {...register(`fields.0.path`)}
            onChange={(e) => handleInputChangeForDataAttribute(0, e)}
            style={{ width: "500px" }}
          />
          <input
            type="checkbox"
            checked={!hiddenFields.includes(0)}
            onChange={() => toggleFieldVisibility(0)}
          />{" "}
          Show
          <button type="button" onClick={() => handleRemoveAttribute(0)}>
            Remove
          </button>
        </div>
      )}

      <textarea
        onChange={handlePresentationDefinitionChange}
        value={filteredPresentationDefinition()}
        style={{ marginTop: "10px", width: "100%", minHeight: "100px" }}
      />

      <form onSubmit={handleSubmit()}>
        {fields.slice(1).map((field, index) => (
          <div key={field.id}>
            <input
              {...register(`fields.${index + 1}.path`)}
              onChange={(e) => handleInputChangeForDataAttribute(index + 1, e)}
              style={{ width: "500px" }}
            />
            <input
              type="checkbox"
              checked={!hiddenFields.includes(index + 1)}
              onChange={() => toggleFieldVisibility(index + 1)}
            />{" "}
            Show
            <button type="button" onClick={() => handleRemoveAttribute(index + 1)}>
              Remove
            </button>
          </div>
        ))}

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
