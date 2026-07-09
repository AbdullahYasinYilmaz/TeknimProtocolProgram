//takes a hexString and returns a uint8 array
export function hexStringToByte(hexString){
    hexString = hexString.replace(/\s/g, ''); //removes whitespace
    try{
        const byteArr = Uint8Array.fromHex(hexString);
        return byteArr;
    }
    catch{
        return new Uint8Array(0);
    }
}

//takes uint8 array and returns a hex string
export function byteToHexString(byteArr){
    return byteArr.toHex();
}