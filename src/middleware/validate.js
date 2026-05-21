export function validate(schema) {
  return (req, _res, next) => {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers
    });

    req.body = parsed.body ?? req.body;
    req.query = parsed.query ?? req.query;
    req.params = parsed.params ?? req.params;
    next();
  };
}
