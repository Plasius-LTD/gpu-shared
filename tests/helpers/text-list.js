// A DOM list double that rejects HTML parsing of public text.
export function createTextList() {
  return {
    children: [],
    get textContent() {
      return this.children.map((child) => child.textContent).join("");
    },
    set innerHTML(_value) {
      throw new Error("List text must not enter an HTML parser");
    },
    replaceChildren(...children) {
      this.children = children;
    },
  };
}
