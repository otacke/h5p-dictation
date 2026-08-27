import semantics from '@root/semantics.json';

/**
 * Get default values from semantics fields.
 * @param {object[]} start Start semantics field.
 * @returns {object} Default values from semantics.
 */
export const getSemanticsDefaults = (start = semantics) => {
  let defaults = {};

  if (!Array.isArray(start)) {
    return defaults; // Must be array, root or list
  }

  start.forEach((entry) => {
    if (typeof entry.name !== 'string') {
      return;
    }

    if (typeof entry.default !== 'undefined') {
      defaults[entry.name] = entry.default;
    }
    if (entry.type === 'list') {
      defaults[entry.name] = []; // Does not set defaults within list items!
    }
    else if (entry.type === 'group' && entry.fields) {
      const groupDefaults = getSemanticsDefaults(entry.fields);
      // Workaround for stupid H5P core behavior treating groups with one child as the child itself
      if (Object.keys(groupDefaults).length === 1) {
        defaults[entry.name] = Object.values(groupDefaults)[0];
      }
      else if (Object.keys(groupDefaults).length > 1) {
        defaults[entry.name] = groupDefaults;
      }
    }
  });

  return defaults;
};
