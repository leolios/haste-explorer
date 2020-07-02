/*
Materialize CSS
AutoInit JS Elements
 */
M.AutoInit();

window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || {READ_WRITE: "readwrite"}; // This line should only be needed if it is needed to support the object's constants for older browsers
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

let Constants = {
    DB: "Haste",

    LS_Server: "server",
    LS_File: "fileEdited",

    CORS_Anywhere: "https://cors-anywhere.herokuapp.com/"
};

if (!('indexedDB' in window)) {
    getPart('critical').then(data => {
        document.body.innerHTML = Handlebars.compile(data)({
            error: 'IndexedDB N\'est pas supporté par votre navigateur.'
        });
    })
} else {
    initApp();
}

function initApp() {
    /*
    Init for user
     */
    refreshServerList();
    refreshServerInfo();

}

document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('.modal');
    var instances = M.Modal.init(elems, {});
    var elems = document.querySelectorAll('.tooltipped');
    var instances = M.Tooltip.init(elems, {});
});

function getPart(s) {
    return fetch('parts/'+s+'.hbs')
        .then(response => response.text())
        .then(data => {return data});
}



function refreshServerList(){
    let DataBase = window.indexedDB.open(Constants.DB, 1);
    DataBase.onerror = function(event) {
        getPart('critical').then(data => {
            document.body.innerHTML = Handlebars.compile(data)({
                error: 'IndexedDB N\'as pas pu ouvrir " Haste " : '+ request.errorCode
            });
        })
    };
    DataBase.onupgradeneeded = function(event) {
        var db = event.target.result;
        var objectStore = db.createObjectStore("servers", { keyPath: "id" });
        objectStore.createIndex("name", "name", { unique: true });
        objectStore.createIndex("url", "url", { unique: true });

        var objectStore2 = db.createObjectStore("files", { keyPath: "id" });
        objectStore2.createIndex("name", "name", { unique: true });
        objectStore2.createIndex("server", "server");
        objectStore2.createIndex("versions", "versions");

        objectStore.transaction.oncomplete = function(event) {
            var ServerOS = db.transaction("servers", "readwrite").objectStore("servers");
            ServerOS.add({
                id: 0,
                name: "PvPZone",
                url: "https://pvpzone.fr/haste/"
            })
        };

    };
    DataBase.onsuccess = function(event) {
        // Do something with request.result!
        let db = event.target.result;
        let transaction = db.transaction(["servers"], "readwrite").objectStore("servers");
        let request = transaction.getAll()
        request.onerror = function(event) {
            getPart('critical').then(data => {
                document.body.innerHTML = Handlebars.compile(data)({
                    error: 'IndexedDB N\'as pas pu trouver la liste des serveurs.'
                });
            })
        };
        request.onsuccess = function(event) {
            console.log(request.result);
            getPart('navbar').then(data => {
                document.getElementById('server-list').innerHTML = Handlebars.compile(data)
                ({
                    servers: request.result,
                    JSON: JSON
                });
            })
        };

    };
}

let server = {
    add: function (name, url) {
        let DataBase = window.indexedDB.open(Constants.DB, 1);
        let id = Math.floor((Math.random() * 100000) + 10);
        DataBase.onsuccess = function(event) {
            var db = event.target.result;
            db.transaction("servers", "readwrite").objectStore("servers")
                .add({
                    id: id,
                    name: name,
                    url: url
                });
                refreshServerList();
        }
    },
    remove: function (id) {
        let DataBase = window.indexedDB.open(Constants.DB, 1);
        console.log("Boomer")
        DataBase.onsuccess = function(event) {
            var db = event.target.result;
            db.transaction("servers", "readwrite").objectStore("servers")
                .delete(id);
                refreshServerList();
        }
    },
    get: function (id) {
        let DataBase = window.indexedDB.open(Constants.DB, 1);
        DataBase.onsuccess = function(event) {
            var db = event.target.result;
            return db.transaction("servers", "readwrite").objectStore("servers")
                .get(id);
        }
    }
}

let openModal = {
    addServer: function () {
        getPart('modal/addServer').then(data => {
            document.getElementById('modal').innerHTML = Handlebars.compile(data)();
        })
        var instance = M.Modal.getInstance(document.getElementById('modal'))
        instance.open();
    }
}

/*
    Modal Functions
 */
function addServerFunction() {
    var elements = {
        name: document.getElementById('addServer-Name').value,
        url: document.getElementById('addServer-URL').value
    }
    server.add(elements.name, elements.url);
}

/*
    SideNav Functions
 */
function loadServer(id) {

    let DataBase = window.indexedDB.open(Constants.DB, 1);
    DataBase.onsuccess = function(event) {
        var db = event.target.result;
        var server = db.transaction("servers", "readwrite").objectStore("servers")
            .get(id);
        server.onsuccess = function(result) {

            fetch(Constants.CORS_Anywhere + server.result.url + '/documents/about', {
                mode: "cors",
                headers: {
                    "origin": "HasteClient",
                    "x-requested-with": "HasteClient",
                },
                redirect: 'follow'
            })
                .then(response => {
                    if(response.status === 200){
                        window.localStorage.setItem(Constants.LS_Server, JSON.stringify(server.result))
                        refreshServerInfo();
                    } else {
                        getPart('modal/error').then(data => {
                            document.getElementById('modal').innerHTML = Handlebars.compile(data)({
                                error: "The server responded with a code " +
                                    response.status +
                                    " ( "+
                                    response.statusText
                                    +" ), check that the file about.md (or other extension) is present as a static file."
                            });
                        })
                        var instance = M.Modal.getInstance(document.getElementById('modal'))
                        instance.open();
                    }
                })
                .catch(error => {
                    getPart('modal/error').then(data => {
                        document.getElementById('modal').innerHTML = Handlebars.compile(data)({
                            error: "The server didn't respond."
                        });
                    })
                    var instance = M.Modal.getInstance(document.getElementById('modal'))
                    instance.open();
                })
        }
    }

}

function refreshServerInfo() {
    var server = JSON.parse(window.localStorage.getItem(Constants.LS_Server));
    let snm = document.getElementsByClassName("serverName")
    for (var i = 0; i < snm.length; i++) {
        snm[i].innerHTML = server.name;
    }
}


let docu = {
    view: function (id) {
        var datasrv = JSON.parse(window.localStorage.getItem(Constants.LS_Server));

        fetch(Constants.CORS_Anywhere + datasrv.url + '/documents/' + id, {
            mode: "cors",
            headers: {
                "origin": "HasteClient",
                "x-requested-with": "HasteClient",
            },
            redirect: 'follow'
        })
            .then(response => {
                if(response.status === 200){

                    return response.json()

                } else {
                    getPart('modal/error').then(data => {
                        document.getElementById('modal').innerHTML = Handlebars.compile(data)({
                            error: "The server responded with a code " +
                                response.status +
                                " ( "+
                                response.statusText
                                +" ), check if the file exists."
                        });
                    })
                    var instance = M.Modal.getInstance(document.getElementById('modal'))
                    instance.open();
                }
            })
            .then(json => {
                document.getElementById("viewCode").innerHTML = '<pre id="box" style="display: block;" class="hljs" tabindex="0"><code>'+htmlEntities(json.data)+'</code></pre>'
                document.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightBlock(block);
                });
                let snm = document.getElementsByClassName("fileName")
                for (var i = 0; i < snm.length; i++) {
                    snm[i].innerText = "Key : " + id;
                }
            })
            .catch(error => {
                getPart('modal/error').then(data => {
                    document.getElementById('modal').innerHTML = Handlebars.compile(data)({
                        error: "The server didn't respond."
                    });
                })
                var instance = M.Modal.getInstance(document.getElementById('modal'))
                instance.open();
            })
    },
    new: function () {
        window.localStorage.removeItem(Constants.LS_File);
        document.getElementById("viewCode").innerHTML = '<textarea id="codeArea" spellcheck="false" style="display: inline-block;"></textarea>'
        let snm = document.getElementsByClassName("fileName")
        for (var i = 0; i < snm.length; i++) {
            snm[i].innerText = "New file";
        }
    },
    createNew: function () {
        var datasrv = JSON.parse(window.localStorage.getItem(Constants.LS_Server));
        let value = document.getElementById("codeArea").value
        if(value === ""){
            return;
        }
        fetch(Constants.CORS_Anywhere + datasrv.url + '/documents/', {
            mode: "cors",
            method: 'POST',
            headers: {
                "origin": "HasteClient",
                "x-requested-with": "HasteClient",
            },
            redirect: 'follow',
            body: value

        })
            .then(response => response.json())
            .then(data => {
                docu.view(data.key)
                M.toast({html: 'File created with id : '+data.key+' in server : ' + datasrv.name})

                /*
                    Add to File DB
                 */
                let DataBase = window.indexedDB.open(Constants.DB, 1);
                let id = Math.floor((Math.random() * 1000000) + 10);
                DataBase.onsuccess = function(event) {
                    var db = event.target.result;

                    var file = new Object();
                    file.id = data.key;

                    var versionsArray = new Array();
                    versionsArray.push(file);

                    db.transaction("files", "readwrite").objectStore("files")
                        .add({
                            id: data.key,
                            name: data.key,
                            server: datasrv.id,
                            versions: JSON.parse(JSON.stringify(versionsArray))
                        });
                }


            })
    },
    duplicateModify: function (id) {
        var datasrv = JSON.parse(window.localStorage.getItem(Constants.LS_Server));

        fetch(Constants.CORS_Anywhere + datasrv.url + '/documents/' + id, {
            mode: "cors",
            headers: {
                "origin": "HasteClient",
                "x-requested-with": "HasteClient",
            },
            redirect: 'follow'
        })
            .then(response => {
                if(response.status === 200){

                    return response.json()

                } else {
                    getPart('modal/error').then(data => {
                        document.getElementById('modal').innerHTML = Handlebars.compile(data)({
                            error: "The server responded with a code " +
                                response.status +
                                " ( "+
                                response.statusText
                                +" ), check if the file exists."
                        });
                    })
                    var instance = M.Modal.getInstance(document.getElementById('modal'))
                    instance.open();
                }
            })
            .then(json => {

                //TODO: Check if is an versioned file

                document.getElementById("viewCode").innerHTML = '<textarea id="codeArea" spellcheck="false" style="display: inline-block;">'+json.data+'</textarea>'


                let snm = document.getElementsByClassName("fileName")
                for (var i = 0; i < snm.length; i++) {
                    snm[i].innerText = "Key : " + id;
                }
            })
            .catch(error => {
                getPart('modal/error').then(data => {
                    document.getElementById('modal').innerHTML = Handlebars.compile(data)({
                        error: "The server didn't respond."
                    });
                })
                var instance = M.Modal.getInstance(document.getElementById('modal'))
                instance.open();
            })
    },
    save: function () {
        if(window.localStorage.getItem(Constants.LS_File)){
            var file = window.localStorage.getItem(Constants.LS_File);
        } else {
            docu.createNew();
        }
    }
}

docu.new();

getPart('modal/warnInDev').then(data => {
    document.getElementById('modal').innerHTML = Handlebars.compile(data)();
    M.Modal.getInstance(document.getElementById('modal')).open()
})





function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
