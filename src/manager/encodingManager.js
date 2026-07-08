//takes a hexString and returns a uint8 array
export function hexStringToByte(hexString){
    hexString = hexString.replace(/\s/g, ''); //removes whitespace
    return Uint8Array.fromHex(hexString);
}

//takes uint8 array and returns a hex string
export function byteToHexString(byteArr){
    return byteArr.toHex();
}