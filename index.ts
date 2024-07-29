import makeWASocket, { DisconnectReason, BufferJSON, useMultiFileAuthState, isJidGroup } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'

const logger = pino({
    name: "wabot",
    level: "debug"
})

class Info {
    type: string
    content: string
    id: string
    isGroup: boolean | undefined
    sender: string
    message: any
    isMention: boolean
    isQuoted: boolean
    isRep: boolean | { message: any }
    msg: string
    args: string[]
  
    constructor(type: string, msg: any) {
      this.type = type
      this.content = JSON.stringify(msg.message)
      this.id = msg.key.remoteJid
      this.isGroup = isJidGroup(this.id)
      this.sender = isJidGroup(this.id) ? msg.key.participant ?? this.id : this.id
      this.message = msg
      this.isMention = this.content.includes('mentionedJid')
      this.isQuoted = this.content.includes("quotedMessage")
      this.isRep = (this.type === 'extendedTextMessage' && this.isQuoted)
        ? { message: msg.message.extendedTextMessage?.contextInfo?.quotedMessage }
        : false
      this.msg = (() => {
            switch (this.type) {
                case 'conversation':
                return msg.message.conversation || ''
                case 'extendedTextMessage':
                return msg.message.extendedTextMessage?.text || ''
                case 'imageMessage':
                return msg.message.imageMessage?.caption || ''
                case 'videoMessage':
                return msg.message.videoMessage?.caption || ''
                case 'reactionMessage':
                return msg.message.reactionMessage?.text || ''
                case 'listResponseMessage':
                return msg.message.listResponseMessage?.singleSelectReply?.selectedRowId || ''
                case 'buttonsResponseMessage':
                return msg.message.buttonsResponseMessage?.selectedButtonId || ''
                default:
                return ''
            }
      })()
      this.args = this.msg.split(/ /gi).slice(1)
    }
  }

async function connectToWhatsapp() {
    logger.info("connecting to whatsapp")
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    const sock = makeWASocket({
        printQRInTerminal: true,
        auth: state,
        // @ts-ignore
        logger: logger
    })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            if(!lastDisconnect) return console.log("last disconnect undefined")
            const shouldReconnect = (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            logger.error('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
            // reconnect if not logged out
            if(shouldReconnect) {
                logger.info("reconnecting to whatsapp")
                connectToWhatsapp()
            }
        } else if(connection === 'open') {
            logger.info('opened connection')
        }
    })
    sock.ev.on('messages.upsert', async Messages => {
        const { messages } = Messages
        let msg = messages[0]
        if(!msg.message) return
        if(msg.key.fromMe) return
        const type = Object.keys(msg.message)[0]
        // @ts-ignore
        if(type === 'protocolMessage' && msg.message[type].type === 0) return
        const data = new Info(type,msg)
        logger.info(`[${data.isGroup ? "group" : "private"}](${data.sender}) ${data.msg}`)
        if(data.isGroup) return
        await sock.readMessages([msg.key])
        if(data.msg.toLowerCase().startsWith("ikut dong rai nama aku")){
            const name: string = data.msg.replace("ikut dong rai nama aku","")
            if(name == "") return await sock.sendMessage(data.sender, { text: "namanya gak boleh kosong yaa, tolong ketik ulang :)"})
            logger.info(`${name} ikut giveaway`)
            await sock.sendMessage(data.sender, { text: "okee good luck ya! :)" })
        }
    })

}

connectToWhatsapp().catch(err => {
    logger.fatal(err)
})