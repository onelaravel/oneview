# Contributing to OneView

Thank you for your interest in contributing to OneView! We welcome contributions from everyone. This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

We are committed to maintaining a welcoming and inclusive community. All contributors are expected to treat each other with respect and follow our code of conduct.

## How Can You Contribute?

### Reporting Bugs
- Check the [issue tracker](https://github.com/onelaravel/oneview/issues) first
- Create a new issue with a clear title and description
- Include steps to reproduce the bug
- Provide example code if possible
- Specify your environment (OS, Node version, etc.)

### Suggesting Enhancements
- Use the issue tracker with clear title and description
- Explain the motivation and use case
- Provide examples of how this would work
- Link to related issues if any

### Code Contributions
We love pull requests! Here's how to get started:

## Development Setup

1. **Fork the repository**
```bash
git clone https://github.com/your-username/oneview.git
cd oneview
```

2. **Install dependencies**
```bash
npm install
```

3. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

4. **Make your changes**
- Follow the code style guidelines below
- Write clean, readable code
- Add comments for complex logic
- Update tests if needed

5. **Build and test**
```bash
npm run build
npm run type-check
npm test
```

6. **Commit your changes**
```bash
git commit -m "feat: add amazing feature"
```

7. **Push to your fork**
```bash
git push origin feature/your-feature-name
```

8. **Create a Pull Request**
- Provide a clear title and description
- Reference related issues
- Include any relevant context

## Code Style Guidelines

### TypeScript
- Use strict mode: `strict: true`
- Write meaningful variable and function names
- Add type annotations
- Avoid `any` type unless necessary
- Use `const` by default, `let` when needed, avoid `var`

### Formatting
- Use 2 spaces for indentation
- Max line length: 100 characters (prefer under 80)
- Use single quotes for strings
- No trailing commas in single-line objects/arrays
- Leave blank line at end of file

### Comments
- Use `//` for single-line comments
- Use `/** */` for documentation comments
- Keep comments concise and meaningful
- Update comments when code changes

### Example
```typescript
/**
 * Retrieves a value from state by key
 * @param key - The state key
 * @returns The state value or undefined
 */
function getStateValue(key: string): unknown {
  // Check if key exists in state
  return state[key];
}
```

## Commit Message Guidelines

Use clear, descriptive commit messages:

```
type(scope): subject

body (optional)

footer (optional)
```

### Types
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring
- **test**: Test additions or changes
- **chore**: Build, dependencies, or tooling changes

### Examples
```
feat(view): add lifecycle hooks
fix(router): prevent double navigation
docs(readme): update installation instructions
refactor(api): simplify error handling
```

## Pull Request Process

1. **Update documentation** if needed
2. **Maintain code coverage** - don't decrease it
3. **Check CI/CD** - all tests must pass
4. **Be responsive** to review comments
5. **Keep commits clean** - rebase if needed

### PR Title Format
```
[TYPE] Brief description

Fix: [issue number] if applicable
Related: [issue number] if applicable
```

## Testing

We strive for good test coverage. When contributing:

```bash
# Run all tests
npm test

# Run type checking
npm run type-check

# Build the project
npm run build
```

## Documentation

- Update README.md if behavior changes
- Add JSDoc comments to public APIs
- Update examples if needed
- Keep documentation in sync with code

## Questions?

- Check [existing issues](https://github.com/onelaravel/oneview/issues)
- Ask on [Discord](https://discord.gg/onelaravel)
- Email: support@onelaravel.com

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project website

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make OneView better! 🚀
