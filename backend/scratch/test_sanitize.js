import expressMongoSanitize from "express-mongo-sanitize";

console.log("expressMongoSanitize exports:", Object.keys(expressMongoSanitize));
console.log("expressMongoSanitize default:", typeof expressMongoSanitize);

const obj = { "$gt": "" };
console.log("Original obj:", obj);
const hasProhibited = expressMongoSanitize.has(obj);
console.log("hasProhibited:", hasProhibited);
expressMongoSanitize.sanitize(obj, { replaceWith: "_" });
console.log("Sanitized obj:", obj);
