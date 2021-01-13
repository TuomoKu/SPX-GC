module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb-base',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    "camelcase": "off",
    "consistent-return": "off", // TODO: turn this on
    "eqeqeq": "off", // TODO: turn this on
    "func-names": "off",
    "global-require": "off",
    "import/newline-after-import": "off",
    "import/order": "off",
    "no-case-declarations": "off", // TODO: turn this on
    "no-console": "off",
    "no-param-reassign": "off",
    "no-plusplus": "off",
    "no-use-before-define": "off", // TODO: turn this on
    "no-var": "off", // TODO: turn this on
    "object-shorthand": "off", // TODO: turn this on
    "prefer-arrow-callback": "off", // TODO: turn this on
    "prefer-const": "off", // TODO: turn this on
    "prefer-destructuring": "off", // TODO: turn this on
    "prefer-template": "off", // TODO: turn this on
    "spaced-comment": "off", // TODO: turn this on
    "vars-on-top": "off", // TODO: turn this on
  },
};
