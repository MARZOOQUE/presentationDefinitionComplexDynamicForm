import React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import './App.css';

const App = () => {
  const { control, handleSubmit, watch, register, setValue } = useForm({
    defaultValues: {
      constraints: {
        fields: [
          {
            path: '$.type',
            filter: {
              type: '',
            },
          },
        ],
      },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'constraints.fields',
  });

  const onSubmit = (data) => {
    // Filter out empty fields before submitting
    const filteredData = data.constraints.fields.map((field) => {
      const filterType = field.filter.type;
      const filteredField = { ...field };

      if (filterType === 'array') {
        filteredField.filter = { type: 'array', contains: field.filter.contains };
      } else if (filterType === 'string') {
        filteredField.filter = { type: 'string', pattern: field.filter.pattern };
      } else if (filterType === 'number') {
        filteredField.filter = {
          type: 'number',
          minimum: field.filter.minimum,
          maximum: field.filter.maximum,
        };
      } else {
        filteredField.filter = { type: '' };
      }

      return filteredField;
    });

    console.log(filteredData);
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <h2>Dynamic Form</h2>
        {fields.map((item, index) => (
          <div key={item.id} className="field-group">
            <div>
              <label>Path:</label>
              <input
                {...register(`constraints.fields.${index}.path`)}
                defaultValue={item.path}
              />
            </div>

            <div>
              <label>Filter Type:</label>
              <Controller
                control={control}
                name={`constraints.fields.${index}.filter.type`}
                render={({ field }) => (
                  <select {...field}>
                    <option value="">Select Type</option>
                    <option value="array">Array</option>
                    <option value="string">String</option>
                    <option value="number">Number</option>
                  </select>
                )}
              />
            </div>

            {watch(`constraints.fields.${index}.filter.type`) === 'array' && (
              <div>
                <label>Contains (const):</label>
                <input
                  {...register(`constraints.fields.${index}.filter.contains.const`)}
                  placeholder="Contains"
                />
              </div>
            )}

            {watch(`constraints.fields.${index}.filter.type`) === 'string' && (
              <div>
                <label>Pattern:</label>
                <input
                  {...register(`constraints.fields.${index}.filter.pattern`)}
                  placeholder="Pattern"
                />
              </div>
            )}

            {watch(`constraints.fields.${index}.filter.type`) === 'number' && (
              <>
                <div>
                  <label>Minimum:</label>
                  <input
                    type="number"
                    {...register(`constraints.fields.${index}.filter.minimum`)}
                    placeholder="Minimum"
                  />
                </div>
                <div>
                  <label>Maximum:</label>
                  <input
                    type="number"
                    {...register(`constraints.fields.${index}.filter.maximum`)}
                    placeholder="Maximum"
                  />
                </div>
              </>
            )}

            <button type="button" onClick={() => remove(index)}>
              Remove
            </button>
          </div>
        ))}

        <button
          type="button"
          className="add-field"
          onClick={() =>
            append({
              path: '$.type',
              filter: {
                type: '',
              },
            })
          }
        >
          Add Field
        </button>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default App;
