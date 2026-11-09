// eslint.config.js
/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
    {
        languageOptions: {
            ecmaVersion: 2022,
            globals: {
                window: 'readonly',
                document: 'readonly',
                localStorage: 'readonly',
                confirm: 'readonly',
                setTimeout: 'readonly',
                clearInterval: 'readonly',
                setInterval: 'readonly',
                require: 'readonly',
                module: 'readonly',
                process: 'readonly',
                __dirname: 'readonly',
                Buffer: 'readonly',
                console: 'readonly',
                URL: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': 'warn',
            'no-undef': 'error',
            'no-constant-condition': 'error'
        }
    },
    {
        files: ['**/*.test.js'],
        languageOptions: {
            globals: {
                describe: 'readonly',
                test: 'readonly',
                expect: 'readonly'
            }
        }
    }
];
