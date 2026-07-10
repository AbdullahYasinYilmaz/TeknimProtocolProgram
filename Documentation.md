# Teknim Protocol Program

Bu dokümanı anlamak için gerekli ön bilgiler:

- Javascript Promise
- Javascript Stream

## Dosya ve Kod Kuralları

Değişken ve fonksyion isimlendirmelerinde **camelCase** tercih edilir. (birinciden sonraki her kelime büyük harfle başlar)

Projede Controller-Model-View mimarisi kullanılır, index.html sayfası script için sadece Controller olan **index.js** dosyasını kullanır. Bu dosya da diğerlerini import eder ve fonksiyonlarını çağırır. Başka hiçbir dosya tek başlarına fonksiyon çağıramaz.

Model olan **manager.js** dosyaları arka plan işlemlerini yapar; port açıp kapatma, okuma ve yazma, şifreleme... Aynı türden dosyaların ve View olan **view.js** dosyalarının alanlarını import edebilirler. Arayüze direkt erişemedikleri için o tür işlemler için view.js metotlarını kullanmalıdırlar. View.js dosyaları html ve css elementlerini manipüle ederler ve kendi türlerinden başka hiçbir dosyayı import edemezler.

- **index.js**

    - index.html'in kullandığı tek dosya
    - Kendi başına fonksiyon çağırabilir
    - Her türlü dosyayı import edebilir

- **manager.js**

    - Arka plan işlemlerini gerçekleştirir
    - manager.js ve view.js import edebilir
    - html ve css'e direkt erişemez bu sebeple view.js metotlarını kullanmalıdır

- **view.js**

    - html ve css işlemlerini gerçekleştirir
    - Diğer view.js dosyalarını import edebilir
    - Arayüzü etkilemek dışında başka bir işlem yapamaz

## serialManager.js

Port'la iletişim için navigator.serial Web API'ı kullanılır.

### connectToPort():

İlk olarak selectPort() ile porta erişim istenir, bu işlem başarılı olunca arayüzden seçilen baudrate'e göre port openPort() ile açılır. Reader'ın sürekli çalışmasında sakınca olmadığı için bağlantı sağlanıldığı gibi okuma işlemine başlar

    //portu seçer, açar ve arayüzü günceller
    export async function connectToPort(){
        enableConnectionButtons(false);

        try{
            const portSelected = await selectPort();
            if(portSelected){
                const baudrate = getBaudrate();
                await openPort(baudrate);
                startReading(); //port kapatılana kadar çalışır
                checkPortUpdateUI();
            }
            else{
                checkPortUpdateUI();
            
        }
        catch(e){
            console.error("Could not connect to Port",e);
            await disconnectFromPort(); //what if it fails?
        }
    }

    //SerialPort nesnesini izler, başarılıysa true döndürür
    async function selectPort(){
        try{
            curPort = await Serial.requestPort();
            return true;
        }
        catch(e){
            console.error("Port could not be selected",e);
            return false;
        }
    }

    async function openPort(bd) {
        try {
            if(!curPort)
                throw new Error("No port selected");
            await curPort.open({ baudRate: bd });
            return true;
        } catch(e) {
            console.error("Failed to open port", e);
            return false;
        }
    }

### disconnectFromPort():

Bu işlem uzun süreceği için isClosing bayrağı ile birden fazla çağrının çalışması engellenir.

Portu kapatabilmemiz için onun ReadableStream ve WriteableStream'lerinin hiçbir okuyucu/yazıcı tarafından kilitlenmemiş olması lazımdır. Bu sebeple ilk önce ReadableStream'in kaynağı "cancel()" işlemi ile bitmiş gibi gösterilir. Porta bağlanınca sonsuz döngüye giren okuyucumuz bu işlemden sonra döngüden çıkar ve Stream üzerindeki kilidini kaldırır. Bu iki işlem asynchronous olduğu için disconnectFromPort() okuyucu işlemini tamamen bitirene kadar bekler.

Okuyucu işini bitirince portu kapatabiliriz.

    //portu kapatır, seçimi kaldırır ve arayüzü günceller

    export async function disconnectFromPort(){
        enableConnectionButtons(false);

        await closePort();
        deselectPort();
        checkPortUpdateUI();
    }

    function deselectPort(){
        curPort = null;
    }

    let isClosing = false; //birden fazla çağrıyı engellemek için flag
    async function closePort() {
        if (!curPort || isClosing)
            return;

        isClosing = true;
        try {
            if(curReader){ 
                await curReader.cancel();
                await readingPromise; //portu   kapatmadan önce okuyucunun  işini bitirmesi beklenir
            }
        await curPort.close();
        } catch(e) {
            console.error("Failed to close port", e);
        }
        finally{
            isClosing = false;
        }
    }

### initHardwareSignals():
İlgilenmemiz gereken başka bir durum da USB kablosunun çıkarılmasıdır. API'ın bize sunduğu serial.disconnect() event'i donanımda bir sorun olduğu zaman ateşlenir, bu eventi index.js program başlatıldığında bu fonksiyona bağlar ve disconnectFromPort()'u çağırır

    export function initHardwareSignals(){
        Serial.addEventListener("disconnect", (event) => {
            disconnectFromPort();
        });
    }

### writeToPort():

Input olarak aldığımız hex stringini byte (Uint8) dizisine dönüştürür ve porta gönderir

    //takes the input, encodes it and sends it to port
    export async function writeToPort(){
        if(!curPort || !curPort.writable){
            console.error("Not connected to any port");
            return;
        }

        const writeStream = curPort.writable;
        curWriter = writeStream.getWriter();

        const inputBuff = getInputText();
        const byteBuff = hexStringToByte(inputBuff);

        try{
            await curWriter.write(byteBuff);
        }
        catch(e){
            console.error("Could not send data to device", e);
        }
        finally{
            curWriter.releaseLock();
            curWriter = null;
        }
    }

### readFromPort():

Stream'den gelen veri parçaları her zaman portun gönderdiği mesaj paketini tamamen kaplamadığı için bazen birden fazla parçayı birleştirmemiz gerekir. Burada seçilen sabit bir IDLE_TIMEOUT_MS değerine göre ilk parça geldikten sonra bir zamanlayıcı başlatılır. Her yeni parçada zamanlayıcı baştan başlatılır ve paket bitene kadar bu işlem devam eder. Timeout olduğunda bu parçalar birleştirilir ve mesaj paketi okunmuş olur.

    //sürekli okuma yapar
    //timeout'a kadar parçaları toplar. Sonunda ekrana yazar
    async function readFromPort(){
        const readStream = curPort.readable;
        curReader = readStream.getReader();

        //Komple paket için yardımcı alanlar
        const IDLE_TIMEOUT_MS = 50;
        let timeoutID = null;
        let completePackage = new Uint8Array(0);
        function appendToPackage(buff1, buff2){
            const mergedBuff = new Uint8Array(buff1.length + buff2.length);
            mergedBuff.set(buff1,0);
            mergedBuff.set(buff2,buff1.length);
            return mergedBuff;
        }
        function sendCompletePackage(){
            if (completePackage.length === 0) return;
            const hexString = byteToHexString(completePackage).toUpperCase();
            writeOutputText(hexString);
            completePackage = new Uint8Array(0);
        }

        while(true){
            try{
                const {done, value} = await curReader.read();
                if(done)
                    break;

                enableManDataSendBtn(false);
                if(timeoutID) clearTimeout(timeoutID);

                completePackage = appendToPackage(completePackage,value);
                timeoutID = setTimeout(()=>{
                    sendCompletePackage();
                    enableManDataSendBtn(true);
                    timeoutID = null;
                },IDLE_TIMEOUT_MS);

            }
            catch(e){
                break;
            }
        }
        // Temizlik
        if (timeoutID) {
            clearTimeout(timeoutID);
        }
        if (completePackage.length > 0) {
            sendCompletePackage();
        }

        if (readStream.locked) {
            curReader.releaseLock();
        }
        curReader = null;
    }