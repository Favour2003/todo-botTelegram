const { Telegraf, session } = require('telegraf')
const Calendar = require('telegraf-calendar-telegram');
const mysql = require('mysql');
const PrettyTable = require('prettytable');
require('dotenv').config();

const TOKEN = process.env.TOKEN;
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const bodyParser = require('body-parser');
const fs = require('fs');

const bot = new Telegraf(TOKEN)
bot.use(session());

//per vedere l'errore
bot.on("polling_error", console.log);

var uname = null;
//creazione connessione con il database
var con = mysql.createPool({
    host: process.env.onlinehost,
    user: process.env.onlineuser,
    password: process.env.onlinepassword,
    database: process.env.onlinedatabase,
    Port: 3306,
    dateStrings: true,
})

// con.connect(function(err) {
//     if (err) throw err;
//     console.log('Connesso con il database!');
// })

//pool.query('select 1 + 1', (err, rows) => { /* */ });

// instantiate the calendar
const calendar = new Calendar(bot, {
    startWeekDay: 1,
    weekDayNames: ["L", "M", "M", "G", "V", "S", "D"],
    monthNames: [
        "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
        "Lug", "Ago", "Set", "Ott", "Nov", "Dic"
    ]
});



bot.start((ctx) => {
    let message = "Scrivi /help per vedere i commandi";
    ctx.reply(message)
})

// per mandare tutti i commandi possibili
bot.help((ctx) => {
    if (ctx.session.isLoggedIn === false || ctx.session.isLoggedIn == null) {
        ctx.reply("/registrati - per fare la registrazione. \n /login - per fare il login.\n /cancel - per annulare un azione.")
    } else ctx.reply("*Gestione dei todo*\n /view_todo - per vedere tutti i tuoi todo. \n /view_todo_fatto - per vedere i todo fatti.\n /view_todo_nonfatto - per i todo non fatti.\n /insert_todo - per inserire un todo \n /update_todo - per aggiornare un todo.\n /update_stato_todo - per aggiornare lo stato del todo. \n /delete_todo - per eliminare un todo.\n\n*Commandi normali* \n /logout - per fare il logout. \n /cancel - per annulare un azione.")

})

bot.hears('hi', (ctx) => {
    ctx.reply('Hey there')
})

//registrazione
bot.command("registrati", (ctx) => {
    if (ctx.session.isLoggedIn === false || ctx.session.isLoggedIn == null) {
        ctx.reply("Scrivi tuo username🔎");
        ctx.session.chatSession = 1;
        ctx.session.utenteAction = "registrazione";
    } else ctx.reply("Devi uscire prima.");

})


//login degli utenti
bot.command("login", (ctx) => {
    if (ctx.session.isLoggedIn === false || ctx.session.isLoggedIn == null) {
        ctx.reply("Scrivi tuo username🔎");
        ctx.session.chatSession = 1;
        ctx.session.utenteAction = "login";
    } else ctx.reply("Sei già entrato.");
})

//log-out
bot.command("logout", (ctx) => {
    if (ctx.session.isLoggedIn === true) {
        ctx.reply("Sei fuori. \nScrivi /help per vedere tutti i commandi possibili.");
        console.log(`Utente uscito: ${ctx.session.username}`);
        ctx.session.isLoggedIn = false;
        cancelAll(ctx);
    } else ctx.reply("Devi essere loggato per effettuare il logout. /login per entrare. ");
})

//annullamento di un'azione
bot.command("cancel", (ctx) => {
    cancelAll(ctx);
})


//visualizzazione dei todo
bot.command("view_todo", (ctx) => {
    if (ctx.session.isLoggedIn === true) {
        viewTodo_condition(ctx, 'view_todo');
    } else ctx.reply("Devi effettuare il /login per vedere i tuoi todo.");
})


//visualizzazione dei todo
bot.command("view_todo_fatto", (ctx) => {
    if (ctx.session.isLoggedIn === true) {
        viewTodo_condition(ctx, "fatto");
    } else ctx.reply("Devi effettuare il /login per vedere i tuoi todo.");
})

//visualizzazione dei todo
bot.command("view_todo_nonfatto", (ctx) => {
    if (ctx.session.isLoggedIn === true) {
        viewTodo_condition(ctx, "non_fatto");
    } else ctx.reply("Devi effettuare il /login per vedere i tuoi todo.");
})



//Inserimento di un todo
bot.command("insert_todo", (ctx) => {
    if (ctx.session.isLoggedIn === true) {
        ctx.session.todoAction = 'insert_todo';
        ctx.reply("Scrivi nome del to-do. ");
        ctx.session.chatSession = 4;
    } else ctx.reply("Devi effettuare il /login per inserire un todo.");
})

//aggiornamento di un todo
bot.command("update_todo", (ctx) => {
    if (ctx.session.isLoggedIn === true) {
        viewTodo_condition(ctx, "view_todo");;
        ctx.session.todoAction = 'update_todo';
        ctx.reply("Scrivi l'id del to-do da aggiornare");
        ctx.session.chatSession = 6;
    } else ctx.reply("Devi effettuare il /login per aggiornare un todo.");
})

//aggiornamento di un todo
bot.command("update_stato_todo", (ctx) => {
    if (ctx.session.isLoggedIn === true) {
        viewTodo_condition(ctx, "view_todo");;
        ctx.session.todoAction = 'update_stato_todo';
        ctx.reply("Scrivi l'id del to-do da aggiornare. ");
        ctx.session.chatSession = 6;
    } else ctx.reply("Devi effettuare il /login per aggiornare un todo.");
})

//eliminazione di un todo
bot.command("delete_todo", (ctx) => {
    if (ctx.session.isLoggedIn === true) {
        viewTodo_condition(ctx, "view_todo");;
        ctx.session.todoAction = 'delete_todo';
        ctx.reply("Scrivi l'id del to-do da eliminare ❌");
        ctx.session.chatSession = 3;
    } else ctx.reply("Devi effettuare il /login per eliminare un todo.");
})

// listen for the selected date event
calendar.setDateListener((ctx, date) => {
    if (ctx.session.todoAction) {
        ctx.reply(date);
        ctx.session.date = date;
        gestioneTodo(ctx);
    }
});

//gestione messaggi
bot.on('message', (ctx) => {
    var text = ctx.message.text.toString().toLowerCase();
    var Hi = "ciao";
    if (ctx.message.text.toString().toLowerCase().indexOf(Hi) === 0) {
        ctx.reply("Hello dear user");
        return;
    }
    //gestione registrazione e login
    if (ctx.session.chatSession === 1 & text.indexOf('/') <= -1) {
        ctx.session.username = text;
        ctx.reply("Scrivi tuo password 👀");
        ctx.session.chatSession = 2;
        return;
    } else if (ctx.session.chatSession === 2 & text.indexOf('/') <= -1) {
        ctx.session.password = text;
        gestioneUtente(ctx);
        return;
    }


    //gestione to - do
    if (ctx.session.chatSession === 3 & text.indexOf('/') <= -1) {
        ctx.session.idTodo = text;
        gestioneTodo(ctx);
        //ctx.session.chatSession = 2;
        return;
    } else
    if (ctx.session.chatSession === 4 & text.indexOf('/') <= -1) {
        ctx.session.todo = text;

        const today = new Date();
        const minDate = new Date();
        minDate.setMonth(today.getMonth() - 0);
        const maxDate = new Date();
        maxDate.setMonth(today.getMonth() + 10);
        maxDate.setDate(today.getDate());

        ctx.reply("Scegli la data di scadenza:", calendar.setMinDate(minDate).setMaxDate(maxDate).getCalendar());
        return;
    } else if (ctx.session.chatSession === 6 & text.indexOf('/') <= -1) {
        ctx.session.idTodo = text;
        ctx.session.name_toupdate = "";
        ctx.session.rows.forEach(row => {
            if (row[0].toString() === ctx.session.idTodo) {
                ctx.session.name_toupdate = row[1];
            }
        });
        if (ctx.session.name_toupdate === "") {
            ctx.reply("Quel id non esiste. \nScrivi /update_todo per aggiornare un todo");
            ctx.session.chatSession = 0;
        } else {
            if (ctx.session.todoAction === "update_stato_todo") {
                ctx.reply("Scrivi /fatto se il to-do è già fatto, o /non_fatto se il to-do NON è ancora fatto. ");
                ctx.session.chatSession = 7;
            } else {
                ctx.reply("Scrivi nome aggiornato del to-do. ");
                ctx.session.chatSession = 4;
            }
        }
        return;
    } else if (ctx.session.chatSession === 7 & text.indexOf('fatto') >= -1) {
        if (text === "/fatto" || text === "/non_fatto") {
            ctx.session.state = text.replace('/', '');
            gestioneTodo(ctx);
        } else {
            ctx.reply("Scrivi /fatto se il to-do è già fatto, o /non_fatto se il to-do NON è ancora fatto. \nPer uscire scrivi /cancel.");
            ctx.session.chatSession = 7;
        }
        return;
    }

    ctx.reply("Non capisco questo messaggio. \nScrivi /help per vedere tutti i commandi possibili.");
});

//gestione degli utenti nel database
function gestioneUtente(ctx) {
    if (ctx.session.utenteAction === "registrazione") {
        var sql = "INSERT INTO utenti(username, password) VALUES (?,?)";
        con.query(sql, [ctx.session.username, ctx.session.password], function(err, result) {
            if (err) throw err;
            console.log("Nuovo utente creato");
            ctx.reply("Sei stato registrato. \nScrivi /login per effettuare il login.");
        })
    } else if (ctx.session.utenteAction === "login") {
        var sql = "SELECT idUtente as number FROM utenti WHERE username = ? AND password = ?";
        con.query(sql, [ctx.session.username, ctx.session.password], function(err, result) {
            if (err) throw err;
            if (result != "") {
                console.log("Utente loggato: " + ctx.session.username);
                ctx.reply(`Benvenuto ${ctx.session.username}. \nScrivi /help per vedere tutti i commandi possibili.`);
                ctx.session.isLoggedIn = true;
                ctx.session.idUtente = result[0].number;
            } else ctx.reply("Nome utente o password errato. \nScrivi /login per effettuare il login di nuovo.");
        })
    }
    ctx.session.chatSession = 0;
    ctx.session.utenteAction = "";
}

//gestione dei todo nel database
function gestioneTodo(ctx) {
    if (ctx.session.todoAction === "delete_todo") {
        ctx.session.name_todelete = "";
        ctx.session.rows.forEach(row => {
            if (row[0].toString() === ctx.session.idTodo) {
                ctx.session.name_todelete = row[1];
            }
        });
        if (ctx.session.name_todelete === "") {
            ctx.reply("Quel id non esiste. \nScrivi /delete_todo per eliminare un todo");
            ctx.session.chatSession = 0;
        } else {
            var sql = "DELETE FROM todo WHERE todo.todo = ? ORDER BY todo.idTodo DESC LIMIT 1";
            con.query(sql, [ctx.session.name_todelete], function(err, result) {
                if (err) throw err;
                console.log("1 todo eliminato");
                ctx.reply("todo eliminato con successo. \nScrivi /help per vedere tutti i commandi possibili.");
                viewTodo_condition(ctx, "view_todo");
            })
        }
    } else if (ctx.session.todoAction === "insert_todo") {
        console.log("I'm here");
        var sql = "INSERT INTO `todo`(`idUtente`, `todo`, `stato`, `scadenza`) VALUES (?,?,'non_fatto',?)";
        con.query(sql, [ctx.session.idUtente, ctx.session.todo, ctx.session.date], function(err, result) {
            if (err) throw err;
            console.log("1 todo inserito");
            ctx.reply("todo inserito con successo. \nScrivi /help per vedere tutti i commandi possibili.");
            viewTodo_condition(ctx, "view_todo");
        })
    } else if (ctx.session.todoAction === "update_todo") {
        var sql = "UPDATE `todo` SET `todo`=?,`scadenza`=? WHERE todo.todo = ?";
        con.query(sql, [ctx.session.todo, ctx.session.date, ctx.session.name_toupdate], function(err, result) {
            if (err) throw err;
            console.log("1 todo aggiornato");
            ctx.reply("todo aggiornato con successo. \nScrivi /help per vedere tutti i commandi possibili.");
            viewTodo_condition(ctx, "view_todo");;
        })
    } else if (ctx.session.todoAction === "update_stato_todo") {
        var sql = "UPDATE `todo` SET `stato`=? WHERE todo.todo = ?";
        con.query(sql, [ctx.session.state, ctx.session.name_toupdate], function(err, result) {
            if (err) throw err;
            console.log("1 stato todo aggiornato");
            ctx.reply("stato todo aggiornato con successo. \nScrivi /help per vedere tutti i commandi possibili.");
            viewTodo_condition(ctx, "view_todo");
        })
    }
    ctx.session.chatSession = 0;
    ctx.session.todoAction = "";
    ctx.session.idTodo = "";
}

function viewTodo_condition(ctx, condition) {
    if (condition === "fatto") {
        var sql = "SELECT todo.todo as to_do, todo.stato as state, todo.scadenza as last FROM todo INNER JOIN utenti ON todo.idUtente = utenti.idUtente WHERE utenti.username = ? AND todo.stato='fatto'";
    } else if (condition === "non_fatto") {
        var sql = "SELECT todo.todo as to_do, todo.stato as state, todo.scadenza as last FROM todo INNER JOIN utenti ON todo.idUtente = utenti.idUtente WHERE utenti.username = ? AND todo.stato='non_fatto'";
    } else {
        var sql = "SELECT todo.todo as to_do, todo.stato as state, todo.scadenza as last FROM todo INNER JOIN utenti ON todo.idUtente = utenti.idUtente WHERE utenti.username = ?";
    }
    con.query(sql, [ctx.session.username], function(err, result) {
        if (err) throw err;
        if (result.length <= 0) {
            ctx.reply('Non trovo nessun todo. \nUsa il commando /insert_todo per inserire un todo.');
            return;
        } else {
            var id = 1;
            ctx.session.rows = []
            pt = new PrettyTable();
            var headers = ["id", "to-do", "stato", "scadenza"];

            ctx.session.rows.length = 0;
            result.forEach(res => {
                if (res.state === "done" || res.state === "fatto") {
                    ctx.session.rows.push([id, res.to_do, "✅", res.last]);
                } else ctx.session.rows.push([id, res.to_do, "❌", res.last]);
                id++;
            });
            console.table(ctx.session.rows);
            pt.create(headers, ctx.session.rows);
            pt.print();

            ctx.reply('<pre>' + pt + '</pre>', { parse_mode: "HTML" });
        }
    })
}

//funzione per svuotare tutto
function cancelAll(ctx) {
    if (ctx.session.isLoggedIn === false || ctx.session.isLoggedIn == null) {
        var text = ctx.message.text.toString().toLowerCase();
        if (text === "/cancel") ctx.reply("Operazione cancellata con successo. \nScrivi /help per vedere tutti i commandi possibili.");
        ctx.session.chatSession = 0;
        ctx.session.utenteAction = "";
        ctx.session.username = "";
        ctx.session.password = "";
        ctx.session.idUtente = 0;
    } else if (ctx.session.isLoggedIn === true) {
        console.log('nooo');
        ctx.reply("Operazione cancellata con successo. \nScrivi /help per vedere tutti i commandi possibili.");
        ctx.session.chatSession = 0;
        ctx.session.utenteAction = "";
        ctx.session.chatSession = 0;
        ctx.session.todoAction = "";
        ctx.session.idTodo = "";
        ctx.session.todo = "";
        ctx.session.state = "";
        ctx.session.date = "";
    }
}

bot.launch();
console.log("bot started");

//configurazioni Sito web

//configurazione engine
app.set("view engine", "ejs");
app.use(express.static(__dirname + '/views'));

// app.use(bodyParser.urlencoded({ extended: false })); // you might want this parser too
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    parameterLimit: 100000,
    limit: '50mb',
    extended: true
}))

app.use(express.urlencoded({ extended: true }))

app.get('/', function(req, res) {
    if (uname === null) {
        res.render("login"); //se l'utente non è loggato lo mando alla pagina di login
    }
})

app.get('/signup', function(req, res) {
    if (uname === null) {
        res.render("signUp");
    }
})

app.get('/home', function(req, res) {
    if (uname === null) {
        res.redirect("/");
    } else {
        var sql = "SELECT * FROM todo INNER JOIN utenti ON todo.idUtente = utenti.idUtente WHERE utenti.username = ? ORDER BY todo.stato ASC";
        con.query(sql, [uname], function(err, result, fields) {
            if (err) throw err;
            res.render("home", { todo: result });
        });
    };
})

app.post('/login', function(req, res) {
    //controllo se i tutti campi sono riempiti
    if (!req.body.uname || !req.body.pass) res.render("login", { errorMessage: "Devi riempire tutti i campi." });
    else {
        var sql = "SELECT * FROM utenti WHERE username = ? AND password = ?";
        con.query(sql, [req.body.uname, req.body.pass], function(err, result) {
            if (err) throw err;
            if (!result.length) {
                res.render("login", { errorMessage: "Username o password sbagliata." });
                console.table(result);
            } else {
                console.table(result)
                uname = result[0].username;
                console.log(uname + " logged in.");
                res.redirect("/home");
            }
        });
    }
})

app.post('/signup', function(req, res) {
    //controllo se i tutti campi sono riempiti
    if (!req.body.uname || !req.body.pass) res.render("login", { errorMessage: "Devi riempire tutti i campi." });
    else {
        var sql = "INSERT INTO utenti(username, password) VALUES (?,?)";;
        con.query(sql, [req.body.uname, req.body.pass], function(err, result) {
            if (err) throw err;
            res.redirect("/");
        });
    }
})

app.post('/logout', function(req, res) {
    uname = null;
    res.render("login");
})

//Commander: terminal
var program = require('commander');
var colors = require("colors/safe");

program
    .version('0.1.0')
    .option('-v, --visualizza', 'Visualizza todo')
    .option('-n, --nome [tipo]', 'Aggiungi username')
    .parse(process.argv);

const options = program.opts();

//visualizzare i todo
if (options.visualizza) {
    if (options.nome) {
        var sql = "SELECT todo.todo, todo.stato, todo.scadenza FROM todo INNER JOIN utenti ON todo.idUtente = utenti.idUtente WHERE utenti.username = ? ORDER BY todo.stato ASC";
        con.query(sql, [options.nome], function(err, result) {
            if (err) throw err;
            if (!result.length) {
                console.table(colors.red('questa utente non esiste.'));
            } else {
                console.table(result);
            }
        });
    } else {
        var sql = "SELECT todo.todo, todo.stato, todo.scadenza FROM todo INNER JOIN utenti ON todo.idUtente = utenti.idUtente ORDER BY todo.stato ASC";
        con.query(sql, function(err, result) {
            if (err) throw err;
            console.table(result);
        });
    }
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});