const WIKI_API_URL = "https://en.wikipedia.org/w/api.php?action=query&origin=*&format=json&formatversion=2&prop=pageimages|pageterms&pithumbsize=800&pilicense=any&titles=";

async function GetPortrait(ranked_wiki_url) {
    const url_to_fetch = WIKI_API_URL + ranked_wiki_url.substring(30);

    const response = await fetch(url_to_fetch);

    const wiki_json = await response.json();

    return wiki_json.query.pages[0].thumbnail.source;
}

async function LoadData(csv_name) {
    return new Promise((resolve, reject) => {
        Papa.parse(`https://raw.githubusercontent.com/IonImpulse/ranking-engine/main/data/${csv_name}`, {
            download: true,
            dynamicTyping: true,
            worker: true,
            header: true,
            complete(results, file) {
                resolve(results.data)
            },
            error(err, file) {
                reject(err)
            }
        });
    });
}

async function LoadWikiURLS(ranked_data) {
    console.log(ranked_data);

    let urls = [];

    for (i = 0; i < ranked_data.length; i++) {
        urls.push(GetPortrait(ranked_data[i].wiki_url));
    }

    urls = await Promise.all(urls);

    return urls;
}


function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

var items = [],
    prepItems = function (list) {
        list = list.map(function (item) {
            return [item];
        });
        items = list.sort(function () {
            return Math.random() > 0.5;
        }).reverse();
    };

var listOne = [], listTwo = [], joined = [],
    joinRunningTotal = 0;

function nextItems() {
    const ranked_data = JSON.parse(sessionStorage.getItem("ranked_data"));
    const urls = JSON.parse(sessionStorage.getItem("ranked_urls"));

    let remaining = listOne.length + listTwo.length;

    // If there are items left in the lists we're sorting, queue them up to get sorted
    if (remaining > 0) {
        if (listTwo.length === 0) {
            while (listOne.length > 0) {
                joined.push(listOne.shift());
            }
            items.push(joined);
            joinRunningTotal += joined.length;
            nextItems();
            return;
        } else if (listOne.length === 0) {
            while (listTwo.length) {
                joined.push(listTwo.shift());
            }
            items.push(joined);
            joinRunningTotal += joined.length;
            nextItems();
        } else {
            var e1 = listOne[0],
                e2 = listTwo[0];

            let left_card = document.getElementById("left-button");
            let right_card = document.getElementById("right-button");

            let left_html = `<img class="ranked-pic" src="${urls[e1]}"/> ${ranked_data[e1].name}`;
            let right_html = `<img class="ranked-pic" src="${urls[e2]}"/> ${ranked_data[e2].name}`;

            if (left_card.innerHTML != left_html) {
                left_card.innerHTML = left_html;
            }

            if (right_card.innerHTML != right_html) {
                right_card.innerHTML = right_html;
            }
            
            UTIF.replaceIMG();
            return;
        }
    } else {
        if (items.length > 1) {
            listOne = items.shift();
            listTwo = items.shift();
            joined = [];
            nextItems();
            return;
        } else {
            // We're done, we only have one array left, and it's sorted

            items = items[0].filter(function (element) {
                return element !== undefined;
            });

            console.log(items);

            const csv_file = sessionStorage.getItem("csv_file");

            document.location = document.location.href + `?file=${csv_file}&code=${items.join("+")}`;
            
            setup();
        }
    }
}

function getBaseUrl() {
    return window.location.href.match(/^.*\//);
}

function GoHome() {
    document.location = getBaseUrl();
}

function GoToWiki() {
    ranked_index = parseInt(this.id.split("-")[2]);
    const ranked_data = JSON.parse(sessionStorage.getItem("ranked_data"));

    console.log(ranked_data[ranked_index]);

    document.location = ranked_data[ranked_index].wiki_url;
}
selected = function (which) {
    switch (which) {
        case 'left':
            joined.push(listTwo.shift());
            break;
        case 'right':
            joined.push(listOne.shift());
            break;
    }

    nextItems();
};

function CopyToClipboard() {
    var dummy = document.createElement('input'),
    text = window.location.href;

    document.body.appendChild(dummy);
    dummy.value = text;
    dummy.type = "text";
    dummy.select();
    document.execCommand('copy');
    document.body.removeChild(dummy);

    document.getElementById("question").innerHTML = "Copied!";
}

async function setup() {
    const CSV_FILE_LINK = {
        "Dictators": "dictators.csv",
        "US Presidents": "us_presidents.csv",
    };

    let choices_elem = document.getElementById("choices-holder");
    let question_elem = document.getElementById("question");

    if (document.location.href.includes("?file=")) {
        const urlParams = new URLSearchParams(window.location.search);
        
        question_elem.innerHTML = "Loading...";

        choices_elem.innerHTML = "";

        question_elem.innerText = "Click to copy custom list link!";
        question_elem.addEventListener("click",CopyToClipboard);
        question_elem.style.cursor = "pointer";

        choices_elem.innerHTML = "";

        console.log(urlParams.get('file'));
        console.log(urlParams.get('code'));
        const ranked_data = await LoadData(urlParams.get('file'));
        const urls = await LoadWikiURLS(ranked_data);
        const ranked_list = urlParams.get('code').split(" ");

        for (i in ranked_list.reverse()) {
            let ranked_index = parseInt(ranked_list[i]);
            choices_elem.innerHTML += `\n<div id="ranked-num-${ranked_index}" class="good-button">\b<img class="ranked-pic" src="${urls[ranked_index]}"/>\n${i - -1}) ${ranked_data[ranked_index].name}</div>\n`;
        }

        for (i in ranked_list.reverse()) {
            let ranked_index = parseInt(ranked_list[i]);

            document.getElementById(`ranked-num-${ranked_index}`).addEventListener("click", GoToWiki);
        }

        UTIF.replaceIMG();

    } else {
        for ([key, value] of Object.entries(CSV_FILE_LINK)) {
            console.log(key,value);
            choices_elem.innerHTML += `<div class="good-button" id="left-button" onclick="start('${value}')">${key}</div>\n`;
        }
    }
    
}


async function start(csv_file) {
    document.getElementById("choices-holder").innerHTML = `<div class="good-button" id="left-button" onclick="selected('left')">LOADING...</div>
    <div class="good-button" id="right-button" onclick="selected('right')">LOADING...</div>`;
    document.getElementById("question").innerHTML = "Which one?";

    sessionStorage.setItem("csv_file", csv_file);

    let ranked_list = false;
    
    
    console.log("Loading data...");

    const ranked_data = await LoadData(csv_file);
    const urls = await LoadWikiURLS(ranked_data);
    sessionStorage.setItem("ranked_data", JSON.stringify(ranked_data));
    
    let sort_keys = [];
    for (i = 0; i < ranked_data.length; i++) {
        sort_keys.push(i);
    }

    sessionStorage.setItem("ranked_urls", JSON.stringify(urls));

    const totalJoin = (function () {
        var arr = [],
            total = 0;

        for (var i = 0; i < ranked_data.length; ++i) {
            arr.push(1);
        }

        while (arr.length > 1) {
            var a = arr.pop(),
                b = arr.pop(),
                c = a + b;
            total += c;
            arr.unshift(c);
        }

        return total;
    })();


    console.log("Loaded data!");

    prepItems(sort_keys);

    console.log(sort_keys);

    list = sort_keys;

    nextItems();
}

document.getElementById("top").addEventListener("click", GoHome);

setup();