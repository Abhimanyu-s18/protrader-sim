// Custom Jest serializer for BigInt values
module.exports = {
  serialize(val) {
    return val.toString() + 'n'
  },
  deserialize(val) {
    return BigInt(val.slice(0, -1))
  },
  test(val) {
    return typeof val === 'bigint'
  },
}
