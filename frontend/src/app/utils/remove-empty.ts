// La API (Joi) responde 422 si le llega un campo vacío o null, así que antes de enviar
// un formulario quito esos campos. Un campo opcional que no se envía se queda como estaba.
export function removeEmpty<T extends object>(data: T): Partial<T> {
  const result: Partial<T> = {};

  for (const key of Object.keys(data) as (keyof T)[]) {
    const value = data[key];
    const isEmpty =
      value === null || value === undefined || (typeof value === 'string' && value.trim() === '');

    if (!isEmpty) {
      result[key] = value;
    }
  }

  return result;
}
