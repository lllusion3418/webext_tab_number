module.exports = {
    "env": {
        "webextensions": true,
        "browser": true,
        "es6": true
    },
    "extends": "eslint:recommended",
    "rules": {
        "indent": [
            "error",
            4
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-unused-vars": [
            "error"
        ],
        "keyword-spacing": [
            "error"
        ],
        "eqeqeq": [
            "error",
            "smart"
        ],
        "space-infix-ops": [
            "error",
            {
                "int32Hint": true
            }
        ],
        "comma-spacing": [
            "error"
        ],
        "brace-style": [
            "error"
        ],
        "curly": [
            "error",
            "multi-line"
        ],
        "no-undef": [
            "error"
        ],
        "no-console": [
            "error"
        ],
    }
};
