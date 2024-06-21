import React, { useEffect } from "react";
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
  const {
    register,
    control,
    handleSubmit,
    setValue,
    onSubmit,
    watch,
    resetField,
  } = useForm({
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

  useEffect(() => {
    // if (
    //   presentationDefinitionValue === "" ||
    //   presentationDefinitionValue === undefined
    // ) {
    //   setCredentialIsValid(false);
    // } else setCredentialIsValid(true);

    if (presentationDefinitionValue) {
      resetField("fields");

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
  }, [presentationDefinitionValue]);

  const handlePresentationDefinitionChange = (e) => {
    setValue("presentationDefinition", e.target.value);
  };

  const handlePathChangeDebounced = debounce((index, value) => {
    const updatedFields = fields.map((field, i) =>
      i === index ? { ...field, path: value } : field
    );
    updateJsonValue(updatedFields);
  }, 100);

  const updateJsonValue = (updatedFields) => {
    const updatedJson = JSON.parse(
      JSON.stringify(JSON.parse(presentationDefinitionValue))
    );
    updatedFields.forEach((field, index) => {
      updatedJson.constraints.fields[index].path[0] = field.path;
    });

    setValue("presentationDefinition", JSON.stringify(updatedJson, null, 2));
  };

  const handleInputChangeForDataAttribute = (index, e) => {
    const value = e.target.value;
    handlePathChangeDebounced(index, value);
  };

  const handleRemoveAttribute = (index) => {
    remove(index);
    const updatedJson = JSON.parse(presentationDefinitionValue);
    updatedJson.constraints.fields.splice(index, 1);
    setValue("presentationDefinition", JSON.stringify(updatedJson, null, 2));
  };
  return (
    <div>
      <textarea
        onChange={handlePresentationDefinitionChange}
        value={watch("presentationDefinition")}
      />
      <form onSubmit={handleSubmit(onSubmit)}>
        {fields.map((field, index) => (
          <div key={field.id}>
            <input
              {...register(`fields.${index}.path`, {
                required: true,
              })}
              value={field.path}
              onChange={(e) => handleInputChangeForDataAttribute(index, e)}
            />

            <button type="button" onClick={() => handleRemoveAttribute(index)}>
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
              append({ path: [""] });
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
