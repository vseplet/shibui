export function createRandomContext(BaseClass: any) {
  const className = "CTX_" + Math.random().toString(36).substring(2, 15);

  // Создаем класс через шаблонную строку и сразу вызываем ее с передачей BaseClass
  return new Function(
    "BaseClass",
    `
    return class ${className} extends BaseClass {
      constructor(...args) {
        super(...args);
        this.name = "${className}";
      }
    }
  `,
  )(BaseClass);
}
