export function mixinUuid(): any {
  return function <T extends { new (...args: any[]): Record<string, any> }>(constructor: T): any {
    // return function (constructor: Function) {
    let counter = 0;
    return class extends constructor {
      // Globally unique ID for all elements.
      readonly uuid: number = counter++;
    };
  };
}
