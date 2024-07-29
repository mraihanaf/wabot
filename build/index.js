"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({
    name: "wabot",
    level: "debug"
});
class Info {
    constructor(type, msg) {
        var _a, _b, _c;
        this.type = type;
        this.content = JSON.stringify(msg.message);
        this.id = msg.key.remoteJid;
        this.isGroup = (0, baileys_1.isJidGroup)(this.id);
        this.sender = (0, baileys_1.isJidGroup)(this.id) ? (_a = msg.key.participant) !== null && _a !== void 0 ? _a : this.id : this.id;
        this.message = msg;
        this.isMention = this.content.includes('mentionedJid');
        this.isQuoted = this.content.includes("quotedMessage");
        this.isRep = (this.type === 'extendedTextMessage' && this.isQuoted)
            ? { message: (_c = (_b = msg.message.extendedTextMessage) === null || _b === void 0 ? void 0 : _b.contextInfo) === null || _c === void 0 ? void 0 : _c.quotedMessage }
            : false;
        this.msg = (() => {
            var _a, _b, _c, _d, _e, _f, _g;
            switch (this.type) {
                case 'conversation':
                    return msg.message.conversation || '';
                case 'extendedTextMessage':
                    return ((_a = msg.message.extendedTextMessage) === null || _a === void 0 ? void 0 : _a.text) || '';
                case 'imageMessage':
                    return ((_b = msg.message.imageMessage) === null || _b === void 0 ? void 0 : _b.caption) || '';
                case 'videoMessage':
                    return ((_c = msg.message.videoMessage) === null || _c === void 0 ? void 0 : _c.caption) || '';
                case 'reactionMessage':
                    return ((_d = msg.message.reactionMessage) === null || _d === void 0 ? void 0 : _d.text) || '';
                case 'listResponseMessage':
                    return ((_f = (_e = msg.message.listResponseMessage) === null || _e === void 0 ? void 0 : _e.singleSelectReply) === null || _f === void 0 ? void 0 : _f.selectedRowId) || '';
                case 'buttonsResponseMessage':
                    return ((_g = msg.message.buttonsResponseMessage) === null || _g === void 0 ? void 0 : _g.selectedButtonId) || '';
                default:
                    return '';
            }
        })();
        this.args = this.msg.split(/ /gi).slice(1);
    }
}
function connectToWhatsapp() {
    return __awaiter(this, void 0, void 0, function* () {
        logger.info("connecting to whatsapp");
        const { state, saveCreds } = yield (0, baileys_1.useMultiFileAuthState)('auth_info');
        const sock = (0, baileys_1.default)({
            printQRInTerminal: true,
            auth: state,
            // @ts-ignore
            logger: logger
        });
        sock.ev.on('creds.update', saveCreds);
        sock.ev.on('connection.update', (update) => {
            var _a, _b;
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                if (!lastDisconnect)
                    return console.log("last disconnect undefined");
                const shouldReconnect = ((_b = (_a = lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode) !== baileys_1.DisconnectReason.loggedOut;
                logger.error('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
                // reconnect if not logged out
                if (shouldReconnect) {
                    logger.info("reconnecting to whatsapp");
                    connectToWhatsapp();
                }
            }
            else if (connection === 'open') {
                logger.info('opened connection');
            }
        });
        sock.ev.on('messages.upsert', (Messages) => __awaiter(this, void 0, void 0, function* () {
            const { messages } = Messages;
            let msg = messages[0];
            if (!msg.message)
                return;
            if (msg.key.fromMe)
                return;
            const type = Object.keys(msg.message)[0];
            // @ts-ignore
            if (type === 'protocolMessage' && msg.message[type].type === 0)
                return;
            const data = new Info(type, msg);
            logger.info(`[${data.isGroup ? "group" : "private"}](${data.sender}) ${data.msg}`);
            if (data.isGroup)
                return;
            yield sock.readMessages([msg.key]);
            if (data.msg.toLowerCase().startsWith("ikut dong rai nama aku")) {
                const name = data.msg.replace("ikut dong rai nama aku", "");
                if (name == "")
                    return yield sock.sendMessage(data.sender, { text: "namanya gak boleh kosong yaa, tolong ketik ulang :)" });
                logger.info(`${name} ikut giveaway`);
                yield sock.sendMessage(data.sender, { text: "okee good luck ya! :)" });
            }
        }));
    });
}
connectToWhatsapp().catch(err => {
    logger.fatal(err);
});
