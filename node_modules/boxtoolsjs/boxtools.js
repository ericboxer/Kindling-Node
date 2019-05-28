const EnumTools = {
  /**
   * @description returns the name of an enum value
   * @param {enum} enumGroup
   * @param {*} value
   * @returns
   */
  nameFromEnumValue(enumGroup, value) {
    for (prop in enumGroup) {
      if (enumGroup[prop] == value) {
        return prop
      }
    }
  },
}

const ListTools = {
  /**
   * @description Returns the name of a of an object parameter by value
   * @param {objcet} object
   * @param {*} value
   * @returns
   */
  getKeyByValue(object, value) {
    return Object.keys(object).find((key) => object[key] === value)
  },
}
module.exports = {
  EnumTools,
  ListTools,
}
