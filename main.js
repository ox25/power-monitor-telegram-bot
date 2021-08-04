const { Telegraf, Markup } = require('telegraf');
const SerialPort = require('serialport');
const { StringStream } = require('scramjet'); 
const fs = require('fs');

var config = require('./config.json'); //Потом тоже чтение кфг сделать
var kb = require('./keyboards.js');
var loc = require('./localization.js');

var v1, v2, v3;
var a1, a2, a3;
var w1, w2, w3;
var kwh1, kwh2, kwh3;


var userData = {};

function readUserData(){
    fs.readFile('./userData.json',{encoding: 'utf8'},function(err,data) {
        userData = JSON.parse(data);
        console.log('readUserData()');
    });
}

function writeUserData(){
    fs.writeFile('./userData.json', JSON.stringify(userData, null, '\t'), function (err) {
        if (err)
            return console.error(err);
        console.log('writeUserData()');
    });
}

function tr(ctx, str){ 
    return loc.translate(userData[ctx.from.id].lang, str);
}

setInterval(writeUserData, 30000);
readUserData();

var portOpenRetry;
var serialPort = new SerialPort(config.serialPort, { //TODO: Авто определение порта
    baudRate: config.baudRate,
    parser: new SerialPort.parsers.Readline("\n"),
    autoOpen: true
});

function update(data) {
    console.log('data: ' + data);

    var tempArr = data.split(';'); //TODO: Эту хрень переделать

    v1 = parseFloat(tempArr[0]);     //TODO: Надо проверить как ведет себя с не целыми значениями
    v2 = parseFloat(tempArr[1]);
    v3 = parseFloat(tempArr[2]);

    a1 = parseFloat(tempArr[3]);
    a2 = parseFloat(tempArr[4]);
    a3 = parseFloat(tempArr[5]);

    w1 = parseFloat(tempArr[6]);    
    w2 = parseFloat(tempArr[7]);
    w3 = parseFloat(tempArr[8]);

    kwh1 = parseFloat(tempArr[9]);
    kwh2 = parseFloat(tempArr[10]);
    kwh3 = parseFloat(tempArr[11]);


    for(let uid in userData){
        userData[uid].notif.forEach( (el) => {
            if (checkCondition(el) && ( (Date.now() - el.timestamp) > userData[uid].notifCoolDown || el.timestamp === undefined)  ){
                var replyStr = loc.translate(userData[uid].lang, 'gotNotification');
                
                if(el.line == 0){
                    if(el.moreLess == 1)
                        replyStr += loc.VAWHtranslate(userData[uid].lang, el.VAWH) + '(' + loc.translate(userData[uid].lang, 'anyLine') +  `) ${loc.translate(userData[uid].lang,'notifMore')} ${el.val}\n\n`;
                    else
                        replyStr += loc.VAWHtranslate(userData[uid].lang, el.VAWH) + '(' + loc.translate(userData[uid].lang, 'anyLine') +  `) ${loc.translate(userData[uid].lang,'notifLess')} ${el.val}\n\n`;
                }else {
                    if(el.moreLess == 1)
                        replyStr += loc.VAWHtranslate(userData[uid].lang, el.VAWH) + '(' + loc.translate(userData[uid].lang, 'line') + ' ' + el.line + `) ${loc.translate(userData[uid].lang,'notifMore')} ${el.val}\n\n`;
                    else 
                        replyStr += loc.VAWHtranslate(userData[uid].lang, el.VAWH) + '(' + loc.translate(userData[uid].lang, 'line') + ' ' + el.line + `) ${loc.translate(userData[uid].lang,'notifLess')} ${el.val}\n\n`;
                }
                replyStr += `${loc.translate(userData[uid].lang, 'line')} 1\n`+ //ПОТОМ НАДО ВЫДЕЛИТЬ ЖИРНЫМ ШРИФТОМ ПАРАМЕТР КОТОРЫЙ СРАБОТАЛ
                `${loc.translate(userData[uid].lang, 'voltage')}: ${v1}V\n`+
                `${loc.translate(userData[uid].lang, 'amperage')}: ${a1}A\n`+
                `${loc.translate(userData[uid].lang, 'power')}: ${w1}W\n`+
                `${loc.translate(userData[uid].lang, 'energy')}: ${kwh1}kWh\n\n`+
                
                `${loc.translate(userData[uid].lang, 'line')} 2\n`+
                `${loc.translate(userData[uid].lang, 'voltage')}: ${v2}V\n`+
                `${loc.translate(userData[uid].lang, 'amperage')}: ${a2}A\n`+
                `${loc.translate(userData[uid].lang, 'power')}: ${w2}W\n`+
                `${loc.translate(userData[uid].lang, 'energy')}: ${kwh2}kWh\n\n`+
                
                `${loc.translate(userData[uid].lang, 'line')} 3\n`+
                `${loc.translate(userData[uid].lang, 'voltage')}: ${v3}V\n`+
                `${loc.translate(userData[uid].lang, 'amperage')}: ${a3}A\n`+
                `${loc.translate(userData[uid].lang, 'power')}: ${w3}W\n`+
                `${loc.translate(userData[uid].lang, 'energy')}: ${kwh3}kWh\n`;

                bot.telegram.sendMessage(uid, replyStr);
                
                el.timestamp = Date.now();
                writeUserData();
            }
        });
    }
}
 

function checkCondition(el){
    switch(el.line){
        case 0:
            switch(el.VAWH){
                case 0:
                    if( (el.moreLess == 1) && (v1 > el.val || v2 > el.val || v3 > el.val) ){
                        return 1;
                    }else if((el.moreLess == 0) && (v1 < el.val || v2 < el.val || v3 < el.val)){
                        return 1;
                    }
                    break;
                case 1:
                    if( (el.moreLess == 1) && (a1 > el.val || a2 > el.val || a3 > el.val) ){
                        return 1;
                    }else if((el.moreLess == 0) && (a1 < el.val || a2 < el.val || a3 < el.val)){
                        return 1;
                    }
                    break;
                case 2:
                    if( (el.moreLess == 1) && (w1 > el.val || w2 > el.val || w3 > el.val) ){
                        return 1;
                    }else if((el.moreLess == 0) && (w1 < el.val || w2 < el.val || w3 < el.val)){
                        return 1;
                    }
                    break;
                case 3:
                    if( (el.moreLess == 1) && (kwh1 > el.val || kwh2 > el.val || kwh3 > el.val) ){
                        return 1;
                    }else if((el.moreLess == 0) && (kwh1 < el.val || kwh2 < el.val || kwh3 < el.val)){
                        return 1;
                    }
                    break;
            }
            break;
        case 1:
            switch(el.VAWH){
                case 0:
                    if ( (el.moreLess == 1) && (v1 > el.val)){
                        return 1;
                    }else if ( (el.moreLess == 0) && (v1 < el.val)){
                        return 1;
                    } 
                    break;
                case 1:
                    if ( (el.moreLess == 1) && (a1 > el.val)){
                        return 1;
                    }else if ( (el.moreLess == 0) && (a1 < el.val)){
                        return 1;
                    } 
                    break;
                case 2:
                    if ( (el.moreLess == 1) && (w1 > el.val)){
                        return 1;
                    }else if ( (el.moreLess == 0) && (w1 < el.val)){
                        return 1;
                    } 
                    break;
                case 3:
                    if ( (el.moreLess == 1) && (kwh1 > el.val)){
                        return 1;
                    }else if ( (el.moreLess == 0) && (kwh1 < el.val)){
                        return 1;
                    } 
                    break;
            }
            break;
        case 2:
            switch(el.VAWH){
                case 0:
                    if ( (el.moreLess == 1) && (v2 > el.val)){
                        return 1;
                    }else if ( (el.moreLess == 0) && (v2 < el.val)){
                        return 1;
                    } 
                    break;
                case 1:
                    if ( (el.moreLess == 1) && (a2 > el.val)){
                        return 1;
                    }else if ( (el.moreLess == 0) && (a2 < el.val)){
                        return 1;
                    } 
                    break;
                case 2:
                    if ( (el.moreLess == 1) && (w2 > el.val)){
                        return 1;
                    }else if ( (el.moreLess == 0) && (w2 < el.val)){
                        return 1;
                    } 
                    break;
                case 3:
                    if ( (el.moreLess == 1) && (kwh2 > el.val)){
                        return 1;
                    }else if ( (el.moreLess == 0) && (kwh2 < el.val)){
                        return 1;
                    } 
                    break;
            }
            break;
        case 3:
            switch(el.VAWH){
                case 0:
                    if ( (el.moreLess == 1) && (v3 > el.val)){
                        return 1;
                    }else if ( (el.moreLess == 0) && (v3 < el.val)){
                        return 1;
                    } 
                    break;
                case 1:
                    if ( (el.moreLess == 1) && (a3 > el.val)){
                        return 1;
                    }else if ( (el.moreLess == 0) && (a3 < el.val)){
                        return 1;
                    } 
                    break;
                case 2:
                    if ( (el.moreLess == 1) && (w3 > el.val)){
                        return 1;
                    }else if ( (el.moreLess == 0) && (w3 < el.val)){
                        return 1;
                    } 
                    break;
                case 3:
                    if ( (el.moreLess == 1) && (kwh3 > el.val)){
                        return 1;
                    }else if ( (el.moreLess == 0) && (kwh3 < el.val)){
                        return 1;
                    } 
                    break;
            }
            break;
    }
}

serialPort.on("open", function () {
    console.log('Serialport open');
    clearInterval(portOpenRetry);
});

serialPort.on("close", function () {
    console.log('Serialport closed');
    portOpenRetry = setInterval(tryOpenPort, 3000);
});

function tryOpenPort(){
    console.log('Trying to open port');
    serialPort.open((e) => {console.error(e);});
    
}


serialPort.pipe(new StringStream()) 
    .lines('\n')                  
    .each(                        
        data => update(data)
);

const bot = new Telegraf(config.token);

bot.start((ctx) => {
    var uid = ctx.from.id;
    Object.assign(userData, {
        [uid]:{
            state:0,
            updateMsgTimeout: config.updateMsgTimeout,
            notifCoolDown: config.notificationCoolDown,
            lang : 0,
            notif:[]
        }
    });

    ctx.reply(tr(ctx, 'welcome'), kb.mainKb(userData[uid].lang));
});



bot.command('status', (ctx) => {
    console.log('/status');
    
    var uid = ctx.message.from.id;
    var chat = ctx.update.message.chat;
    var msgId;

    var duration = userData[uid].updateMsgTimeout; //TODOНорм проверку сделать
    var endsAfter = duration;
    var updateInterval;
    
    function replyStr() {
        return `${tr(ctx, 'line')} 1\n`+
        `${tr(ctx, 'voltage')}: ${v1}V\n`+
        `${tr(ctx, 'amperage')}: ${a1}A\n`+
        `${tr(ctx, 'power')}: ${w1}W\n`+
        `${tr(ctx, 'energy')}: ${kwh1}kWh\n\n`+
        
        `${tr(ctx, 'line')} 2\n`+
        `${tr(ctx, 'voltage')}: ${v2}V\n`+
        `${tr(ctx, 'amperage')}: ${a2}A\n`+
        `${tr(ctx, 'power')}: ${w2}W\n`+
        `${tr(ctx, 'energy')}: ${kwh2}kWh\n\n`+
        
        `${tr(ctx, 'line')} 3\n`+
        `${tr(ctx, 'voltage')}: ${v3}V\n`+
        `${tr(ctx, 'amperage')}: ${a3}A\n`+
        `${tr(ctx, 'power')}: ${w3}W\n`+
        `${tr(ctx, 'energy')}: ${kwh3}kWh\n`;
    }

    if(serialPort.isOpen){
        ctx.reply(replyStr() + `\n${tr(ctx, 'realtimeUpd')}(${endsAfter/1000 + tr(ctx, 'sec')})\n`).then(
            function(value) {
                msgId = value.message_id;
            }, 
            function(reason) {
                console.error("Couldn't send msg:" + reason);
                //Выход сделать
            }
        );
    }else {
        ctx.reply(tr(ctx, 'deviceOffline') + replyStr());
        return;
    }

    function updateMsg(){
        endsAfter -= 1000;
        bot.telegram.editMessageText(chat.id, msgId, undefined, replyStr() + `\n${tr(ctx, 'realtimeUpd')}(${endsAfter/1000 + tr(ctx, 'sec')})\n`).then(
            function(value) {
                msgId = value.message_id;
            }, 
            function(reason) {
                console.error("Couldn't update msg: " + reason);
            }
        );
    }

    updateInterval = setInterval(updateMsg, 1000);

    setTimeout( () => {
        clearInterval(updateInterval);
        bot.telegram.editMessageText(chat.id, msgId, undefined, replyStr());
    } ,duration);

});


bot.command('quit', (ctx) => {
    //ctx.telegram.leaveChat(ctx.message.chat.id)
    //ctx.leaveChat()
    ctx.reply('quit ', Markup.removeKeyboard() );
    //Чето нада
});

bot.command('testLoc', (ctx) => {
    ctx.reply( loc.translate(userData[ctx.from.id].lang,'notifAddPt1')  );
});


bot.on('text',(ctx) => {
    var txt = ctx.message.text;
    var uid = ctx.message.from.id;

    console.log(userData[uid].state);

    try{
        switch(userData[uid].state){

            case 0:
                switch(txt){
                    case tr(ctx, 'settings'):
                        userData[uid].state = 1;
                        ctx.reply(tr(ctx, 'settings'),kb.settingsKb(userData[uid].lang)); //Надо найти как выслать клавиатуру без отправки текста
                        break;
                    default:
                        break;
                }
            break; 

            case 1:
                switch(txt){
                    case tr(ctx, 'lang'):
                        userData[uid].state = 2;
                        ctx.reply(tr(ctx, 'lang'), kb.langKb(userData[uid].lang));
                        break;
                    
                    case tr(ctx, 'statusUpdTm'):
                        userData[uid].state = 3;
                        ctx.reply(tr(ctx, 'enterNumSec'), Markup.removeKeyboard());
                        break;

                    case tr(ctx, 'notifications'):
                        userData[uid].state = 4;
                        ctx.reply(tr(ctx, 'notifSettings'), kb.notifKb(userData[uid].lang));
                        break;

                    case tr(ctx, 'back'):
                        userData[uid].state = 0;
                        ctx.reply(tr(ctx, 'mainMenu'), kb.mainKb(userData[uid].lang));
                        break;

                        //TODO НАДО СДЕЛАТЬ ДЕФоЛТ ЧТОБЫ ЕСЛИ ЧТО ОТПРАВЛЯЛ НОВУЮ КЛАВУ!!!!!!

                    case tr(ctx, 'notifCD'):
                        userData[uid].state = 10;
                        ctx.reply(tr(ctx, 'enterNumSec'), Markup.removeKeyboard());
                        break;
                }
                break;
            
            case 2:
                switch(txt){
                    case'Русский':
                        userData[uid].lang = 0;
                        break;
                    case'English':
                        userData[uid].lang = 1;
                        break;
                    case 'Back':
                        userData[uid].state = 1;
                        ctx.reply(tr(ctx, 'settings'),kb.settingsKb(userData[uid].lang));
                        break;
                    case 'Назад':
                        userData[uid].state = 1;
                        ctx.reply(tr(ctx, 'settings'),kb.settingsKb(userData[uid].lang));
                        break;
                }
                break;

            case 3:
                var val = parseInt(txt);
                if ((val < 500) && (val > 0)){
                    userData[uid].updateMsgTimeout = val * 1000;
                    userData[uid].state = 1;
                    ctx.reply(tr(ctx, 'settings'), kb.settingsKb(userData[uid].lang));
                }else{
                    ctx.reply(tr(ctx, 'enterCorrectNum'));
                }
                break;

            case 4:
                switch (txt){
                    case tr(ctx, 'back'):
                        userData[uid].state = 1;
                        ctx.reply(tr(ctx, 'settings'),kb.settingsKb(userData[uid].lang));
                        break;
                    case tr(ctx, 'add'):
                        userData[uid].state = 5;
                        ctx.reply(`${tr(ctx,'notifAddPt1')}___${tr(ctx,'notifAddPt2')}___${tr(ctx,'notifAddPt3')}___`, kb.notifP1Kb(userData[uid].lang));
                        break;

                    case tr(ctx, 'list'):
                        if(userData[uid].notif.length > 0){
                            var replyStr = "";
                            
                            userData[uid].notif.forEach((el, i) => {
                                if (el.line == 0){
                                    if(el.moreLess == 1)
                                        replyStr += `${i}. (${tr(ctx, 'anyLine2')}) ${loc.VAWHtranslate(userData[uid].lang,el.VAWH)} > ${el.val} \n`;
                                    else 
                                        replyStr += `${i}. (${tr(ctx, 'anyLine2')}) ${loc.VAWHtranslate(userData[uid].lang,el.VAWH)} < ${el.val} \n`;
                                }else{
                                    if(el.moreLess == 1)
                                        replyStr += `${i}. (${tr(ctx, 'line') + ' ' + el.line}) ${loc.VAWHtranslate(userData[uid].lang,el.VAWH)} > ${el.val} \n`;
                                    else 
                                        replyStr += `${i}. (${tr(ctx, 'line') + ' ' + el.line}) ${loc.VAWHtranslate(userData[uid].lang,el.VAWH)} < ${el.val} \n`;
                                }
                            });
                            
                            ctx.reply(replyStr);
                        }else{
                            ctx.reply(tr(ctx, 'noNotif'));
                        }
                        break;
                     
                    case tr(ctx, 'del'):
                        if(userData[uid].notif.length > 0){
                            userData[uid].state = 9;
                            var replyStr = tr(ctx, 'chooseNotifToDel');
                            
                            userData[uid].notif.forEach((el, i) => {
                                if (el.line == 0){
                                    if(el.moreLess == 1)
                                        replyStr += `${i}. (${tr(ctx, 'anyLine2')}) ${loc.VAWHtranslate(userData[uid].lang,el.VAWH)} > ${el.val} \n`;
                                    else 
                                        replyStr += `${i}. (${tr(ctx, 'anyLine2')}) ${loc.VAWHtranslate(userData[uid].lang,el.VAWH)} < ${el.val} \n`;
                                }else{
                                    if(el.moreLess == 1)
                                        replyStr += `${i}. (${tr(ctx, 'line') + ' ' + el.line}) ${loc.VAWHtranslate(userData[uid].lang,el.VAWH)} > ${el.val} \n`;
                                    else 
                                        replyStr += `${i}. (${tr(ctx, 'line') + ' ' + el.line}) ${loc.VAWHtranslate(userData[uid].lang,el.VAWH)} < ${el.val} \n`;
                                }
                            });
                            
                            ctx.reply(replyStr, kb.notifDel(userData[uid].lang));
                        }else{
                            ctx.reply(tr(ctx, 'noNotif'));
                        }
                        break;
                }
                break;

            case 8:
                var val = parseInt(txt); //TODO parseFloat nado
                if (val > 0){
                    var tmpNotif = userData[uid].notifTmp;
                    delete tmpNotif.str;
                    tmpNotif.val = val;
                    tmpNotif.timestamp = 0;
                    userData[uid].notif.push(tmpNotif);
                    userData[uid].state = 4;
                    userData[uid].notifTmp = {};
                    ctx.reply(tr(ctx, 'notifAdded'), kb.notifKb(userData[uid].lang));
                }else{
                    ctx.reply(tr(ctx, 'enterCorrectNumMore0'));
                }
                break;

            case 9:
                var val = parseInt(txt); //parseFloat nado
                if (val >= 0 && val <=  userData[uid].notif.length){
                    userData[uid].notif.splice(val, 1);
                    userData[uid].state = 4;
                    ctx.reply(tr(ctx, 'notifDeleted'), kb.notifKb(userData[uid].lang));
                }else{
                    ctx.reply(tr(ctx, 'enterCorrectNum'));
                }

                break;

            case 10:
                var val = parseInt(txt);
                if ((val < 500) && (val > 0)){
                    userData[uid].notifCoolDown = val * 1000;
                    userData[uid].state = 1;
                    ctx.reply(tr(ctx, 'settings'), kb.settingsKb(userData[uid].lang));
                }else{
                    ctx.reply(tr(ctx, 'enterCorrectNum'));
                }
                break;

            default:
                break;
        }
        writeUserData();
    }catch(e){
        console.error(e);
    }
});

bot.action('P1Any', (ctx) => { //st5
    var uid = ctx.from.id;
    var str = tr(ctx,'notifAddPt1')+
    tr(ctx,'any').toLowerCase()+
    tr(ctx,'notifAddPt2');

    ctx.editMessageText(str + '___' + tr(ctx,'notifAddPt3') + '___' , kb.notifP2Kb(userData[uid].lang));
    userData[uid].state = 6;
    userData[uid].notifTmp = {
        line: 0,
        str: str
    };
});

bot.action('P1L1', (ctx) => {
    var uid = ctx.from.id;
    var str = tr(ctx,'notifAddPt1')+
    '1'+
    tr(ctx,'notifAddPt2');

    ctx.editMessageText(str + '___' + tr(ctx,'notifAddPt3') + '___', kb.notifP2Kb(userData[uid].lang));
    userData[uid].state = 6;
    userData[uid].notifTmp = {
        line: 1,
        str: str
    };
});

bot.action('P1L2', (ctx) => {
    var uid = ctx.from.id;
    var str = tr(ctx,'notifAddPt1')+
    '2'+
    tr(ctx,'notifAddPt2');

    ctx.editMessageText(str + '___' + tr(ctx,'notifAddPt3') + '___', kb.notifP2Kb(userData[uid].lang));
    userData[uid].state = 6;
    userData[uid].notifTmp = {
        line: 2,
        str: str
    };
});

bot.action('P1L3', (ctx) => {
    var uid = ctx.from.id;
    var str = tr(ctx,'notifAddPt1')+
    '3'+
    tr(ctx,'notifAddPt2');

    ctx.editMessageText(str + '___' + tr(ctx,'notifAddPt3') + '___', kb.notifP2Kb(userData[uid].lang));
    userData[uid].state = 6;
    userData[uid].notifTmp = {
        line: 3,
        str: str
    };
});

bot.action('P2V', (ctx) => { //st6
    var uid = ctx.from.id;
    userData[uid].notifTmp.str += tr(ctx, 'voltage'); 
    ctx.editMessageText(userData[uid].notifTmp.str + tr(ctx,'notifAddPt3') + '___', kb.notifP3Kb(userData[uid].lang)); //Сделать вместо Х
    userData[uid].state = 7;
    userData[uid].notifTmp.VAWH = 0;
});

bot.action('P2A', (ctx) => {
    var uid = ctx.from.id;
    userData[uid].notifTmp.str += tr(ctx, 'amperage');
    ctx.editMessageText(userData[uid].notifTmp.str + tr(ctx,'notifAddPt3') + '___', kb.notifP3Kb(userData[uid].lang));
    userData[uid].state = 7;
    userData[uid].notifTmp.VAWH = 1;
});

bot.action('P2W', (ctx) => {
    var uid = ctx.from.id;
    userData[uid].notifTmp.str += tr(ctx, 'power');
    ctx.editMessageText(userData[uid].notifTmp.str + tr(ctx,'notifAddPt3') + '___', kb.notifP3Kb(userData[uid].lang));
    userData[uid].state = 7;
    userData[uid].notifTmp.VAWH = 2;
});

bot.action('P2kWh', (ctx) => {
    var uid = ctx.from.id;
    userData[uid].notifTmp.str += tr(ctx, 'energy');
    ctx.editMessageText(userData[uid].notifTmp.str + tr(ctx,'notifAddPt3') + '___', kb.notifP3Kb(userData[uid].lang));
    userData[uid].state = 7;
    userData[uid].notifTmp.VAWH = 3;
}); 

bot.action('P3More', (ctx) => { //st7
    var uid = ctx.from.id;
    userData[uid].notifTmp.str += ' ' + tr(ctx, 'more').toLowerCase() + ' ';
    ctx.editMessageText(userData[uid].notifTmp.str + '('+ tr(ctx, 'enterANum') +')', kb.notifP4Kb(userData[uid].lang));
    userData[uid].state = 8;
    userData[uid].notifTmp.moreLess = 1;
});

bot.action('P3Less', (ctx) => {
    var uid = ctx.from.id;
    userData[uid].notifTmp.str += ' ' + tr(ctx, 'less').toLowerCase() + ' ';
    ctx.editMessageText(userData[uid].notifTmp.str + '('+ tr(ctx, 'enterANum') +')', kb.notifP4Kb(userData[uid].lang));
    userData[uid].state = 8;
    userData[uid].notifTmp.moreLess = 0;
});

bot.action('notifAddCancel', (ctx) => {
    var uid = ctx.from.id;
    ctx.deleteMessage();
    userData[uid].notifTmp = {};
    userData[uid].state = 4;
});

bot.action('notifDelCancel', (ctx) => {
    var uid = ctx.from.id;
    ctx.deleteMessage();
    userData[uid].state = 4;
});


bot.launch();
console.log('bot.launch');

process.once('SIGINT', () => {
    bot.stop('SIGINT');
    serialPort.close(); //TODO UserData сохранить
    console.log('bot.stop');
    process.exit();
});  
process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    serialPort.close();
    console.log('bot.stop');
    process.exit();
});