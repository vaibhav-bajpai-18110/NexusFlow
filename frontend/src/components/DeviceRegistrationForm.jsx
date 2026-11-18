import { useState } from 'react';
import { Check, Plus } from 'lucide-react';

const emptyValues = { name: '', id: '', type: '' };
const deviceTypes = ['Temperature', 'Vibration', 'Pressure', 'Humidity', 'Other'];

function validateDevice(values, existingDevices) {
  const name = values.name.trim();
  const id = values.id.trim();
  const errors = {};

  if (!name) errors.name = 'Enter a device name.';
  else if (name.length < 2) errors.name = 'Use at least 2 characters.';
  else if (name.length > 50) errors.name = 'Keep the name under 50 characters.';

  if (!id) errors.id = 'Enter a device ID.';
  else if (!/^[A-Za-z0-9_-]{2,30}$/.test(id)) errors.id = 'Use 2–30 letters, numbers, hyphens, or underscores.';
  else if (existingDevices.some((device) => device.id.toLowerCase() === id.toLowerCase())) {
    errors.id = 'That device ID is already registered.';
  }

  if (!deviceTypes.includes(values.type)) errors.type = 'Choose a device type.';
  return errors;
}

export default function DeviceRegistrationForm({ existingDevices, onRegister }) {
  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState({});

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => current[name] ? { ...current, [name]: '' } : current);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validateDevice(values, existingDevices);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onRegister({
      name: values.name.trim(),
      id: values.id.trim().toUpperCase(),
      type: values.type,
    });
    setValues(emptyValues);
    setErrors({});
  };

  return (
    <form className="panel registration-panel" onSubmit={handleSubmit} noValidate>
      <div className="registration-heading">
        <span className="registration-heading-icon"><Plus size={17} /></span>
        <div>
          <h2>Register a device</h2>
          <p>Add a device to this demo workspace.</p>
        </div>
      </div>

      <div className={`form-field${errors.name ? ' form-field-error' : ''}`}>
        <label htmlFor="device-name">Device name</label>
        <input
          id="device-name"
          name="name"
          type="text"
          value={values.name}
          onChange={handleChange}
          placeholder="e.g. Turbine 05"
          maxLength={50}
          autoComplete="off"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'device-name-error' : undefined}
        />
        {errors.name && <span className="field-error" id="device-name-error" role="alert">{errors.name}</span>}
      </div>

      <div className={`form-field${errors.id ? ' form-field-error' : ''}`}>
        <label htmlFor="device-id">Device ID</label>
        <input
          id="device-id"
          name="id"
          type="text"
          value={values.id}
          onChange={handleChange}
          placeholder="e.g. TURBINE_005"
          maxLength={30}
          autoComplete="off"
          spellCheck="false"
          aria-invalid={Boolean(errors.id)}
          aria-describedby={errors.id ? 'device-id-error' : 'device-id-hint'}
        />
        {errors.id
          ? <span className="field-error" id="device-id-error" role="alert">{errors.id}</span>
          : <span className="field-hint" id="device-id-hint">Unique; letters, numbers, _ and -.</span>}
      </div>

      <div className={`form-field${errors.type ? ' form-field-error' : ''}`}>
        <label htmlFor="device-type">Device type</label>
        <select
          id="device-type"
          name="type"
          value={values.type}
          onChange={handleChange}
          aria-invalid={Boolean(errors.type)}
          aria-describedby={errors.type ? 'device-type-error' : undefined}
        >
          <option value="">Choose a type</option>
          {deviceTypes.map((type) => <option value={type} key={type}>{type}</option>)}
        </select>
        {errors.type && <span className="field-error" id="device-type-error" role="alert">{errors.type}</span>}
      </div>

      <button className="button button-primary registration-submit" type="submit">
        <Check size={15} /> Register device
      </button>
      <p className="registration-footnote">New devices start as Pending. This demo saves the registry in this browser.</p>
    </form>
  );
}
