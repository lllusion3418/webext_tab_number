module.exports = {
    "env": {
        "webextensions": true,
        "browser": true,
        "es6": true,
    },
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module",
    },
    "extends": "eslint:recommended",
    "rules": {
        "indent": [
            "error",
            4,
            {
                "SwitchCase": 1,
            }
        ],
        "linebreak-style": [
            "error",
            "unix",
        ],
        "quotes": [
            "error",
            "double",
            {
                "avoidEscape": true,
            },
        ],
        "semi": [
            "error",
            "always",
        ],
        "no-unused-vars": [
            "error",
        ],
        "keyword-spacing": [
            "error",
        ],
        "eqeqeq": [
            "error",
            "smart",
        ],
        "space-infix-ops": [
            "error",
            {
                "int32Hint": true,
            },
        ],
        "comma-spacing": [
            "error",
        ],
        "brace-style": [
            "error",
        ],
        "curly": [
            "error",
            "multi-line",
        ],
        "no-undef": [
            "error",
        ],
        "no-console": [
            "error",
        ],
        "strict": [
            "error",
            "global",
        ],
        "comma-dangle": [
            "error",
            "always-multiline",
        ],
        "no-octal": [
            "error",
        ],
        "no-trailing-spaces": [
            "error",
        ],
        "eol-last": [
            "error",
        ],
        "max-len": [
            "error",
            {
                "code": 100,
                "ignoreUrls": true,
            },
        ],
    },
};
