
export const queryStringAppend = (base: string, attrs: { [k: string]: boolean | string | string[] | number | number[]; }) => {
  let queryString = Object.entries(attrs).map(([key, value]) => {
    value = Array.isArray(value) ? value.join(',') : value.toString();
    return `${key}=${value}`;
  }).join('&');
  return base + (base.indexOf('?') === -1 ? '?' : '&') + queryString;
};
