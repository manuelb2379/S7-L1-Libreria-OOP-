
// === Classi ===
class Libro {

    letto = false;

    constructor(_titolo, _autore, _anno) {
        this.id = crypto.randomUUID();
        this.titolo = _titolo;
        this.autore = _autore;
        this.anno = _anno;
    }

    segnaComeLetto() {
        this.letto = true;
    }

    formato() {
        return 'cartaceo';
    }

    static fromJSON(d) {
        return Object.assign(new this(d.titolo, d.autore, d.anno), d);
    }

};

class LibroDigitale extends Libro {
    constructor(_titolo, _autore, _anno, _dimensioneMb) {

        super(_titolo, _autore, _anno);
        this.dimensioneMb = _dimensioneMb;
    }

    formato() {
        return `digitale (${this.dimensioneMb} MB)`;
    }

    static fromJSON(d) {
        return Object.assign(new this(d.titolo, d.autore, d.anno, d.dimensioneMb), d);
    }
}

//====== Local Storage =======

const STORAGE_KEY = 'libri';

function salvaLibri() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(libri));
}

function caricaLibri() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
            .map((d) => d.dimensioneMb !== undefined
                ? LibroDigitale.fromJSON(d)
                : Libro.fromJSON(d));
    } catch (err) {
        console.error('Dati in localStorage non validi:', err);
        return [];
    }
}


// === Stato (array di libri) ===

let libri = caricaLibri();

const listaLibri = document.querySelector('#lista-libri');
const contatore = document.querySelector('#contatore');
const form = document.querySelector('#aggiungi-libro');
const selectFormato = document.querySelector('#formato');
const campoDimensione = document.querySelector('#campo-dimensione');

const svuotaTutto = document.querySelector("#svuota-tutto")

const inputCerca = document.querySelector('#cerca');
const spinner = document.querySelector('#spinner');
const errore = document.querySelector('#errore');
const risultati = document.querySelector('#risultati');

// ==== Funzioni dei 3 helper ====

function mostraSpinner() {
    spinner.hidden = false;
    errore.hidden = true;
}

function nascondiSpinner() {
    spinner.hidden = true;
}

function mostraErrore(msg) {
    errore.textContent = msg;
    errore.hidden = false;
}

// === Render ===

function renderLibri() {

    // Se non ci libri, mostra un messaggio informativo
    if (libri.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Al momento non ci sono libri inseriti nella tua libreria, ricercane uno oppure inseriscilo tu a mano!';

        // Puoi opzionalmente aggiungere una classe per personalizzarlo (es. testo centrato o grigio)
        li.style.justifyContent = 'center';
        li.style.color = '#666';
        li.style.fontStyle = 'italic';

        listaLibri.replaceChildren(li);
        contatore.textContent = 0;
        return; // Interrompe l'esecuzione della funzione qui
    }

    const righe = libri.map((l) => {
        const li = document.createElement('li');

        if (l.letto) li.classList.add('letto');

        li.dataset.id = l.id;

        const info = document.createElement('div');
        info.classList.add('info');

        const titolo = document.createElement('span');
        titolo.textContent = l.titolo;

        const badge = document.createElement('span');
        badge.classList.add('badge');
        badge.textContent = l.formato();

        const meta = document.createElement('p');
        meta.classList.add('meta');
        meta.textContent = `${l.autore} - ${l.anno}`;

        info.append(titolo, badge, meta);

        const azioni = document.createElement('div');
        azioni.classList.add('azioni');

        if (l.letto) {
            azioni.textContent = '\u2713 letto'; //codice per simbolo di spunta ✓
        } else {
            const bottone = document.createElement('button');
            bottone.type = 'button';
            bottone.dataset.azione = 'leggi';
            bottone.textContent = 'Segna come letto';
            azioni.appendChild(bottone);
        }

        //bottone per rimuovere
        const bottoneRimuovi = document.createElement('button');
        bottoneRimuovi.type = 'button';
        bottoneRimuovi.dataset.azione = 'rimuovi';
        bottoneRimuovi.textContent = 'Rimuovi';

        azioni.append(bottoneRimuovi);

        li.append(info, azioni);
        return li;
    });

    listaLibri.replaceChildren(...righe);

    contatore.textContent = libri.length;
};

// === Cerca ===

let controller;
let ultimiDocs = [];

function cerca(query) {
    //Se c'è una richiesta ancora in corso, la annulliamo
    //(?. evita errori la prima volta, quando controller è undefined)
    controller?.abort();
    // Nuovo controller per la nuova richiesta
    controller = new AbortController();
    const { signal } = controller;

    mostraSpinner();

    const url = new URL('https://openlibrary.org/search.json');
    url.searchParams.set("q", query);
    url.searchParams.set("limit", 10);

    fetch(url, { signal })
        .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then((dati) => renderRisultati(dati.docs))
        .catch((err) => {
            // AbortError = l'abbiamo annullata noi di proposito: non è un errore
            if (err.name === "AbortError") return;
            mostraErrore(`Errore durante la ricerca: ${err.message}`);
        })
        .finally(() => {
            // Nascondiamo lo spinner solo se questa richiesta NON è stata
            // annullata (altrimenti lo spinner appartiene alla nuova richiesta)
            if (!signal.aborted) nascondiSpinner();
        });
}

function renderRisultati(docs) {

    ultimiDocs = docs;
    // Nessun risultato: un solo <li> informativo, poi usciamo
    if (docs.length === 0) {
        const vuoto = document.createElement('li');
        vuoto.textContent = 'Nessun risultato.';
        risultati.replaceChildren(vuoto);
        return;
    }

    const righe = docs.map((d) => {
        // author_name è un array e può mancare: ?.[0] prende il primo
        // autore in sicurezza, ?? mette un valore di default
        const autore = d.author_name?.[0] ?? "Autore sconosciuto";
        const anno = d.first_publish_year ?? "?";

        //i dati arrivano da un'API esterna e
        // potrebbero contenere HTML malevolo (XSS). textContent lo
        // tratta sempre come semplice testo.
        const li = document.createElement('li');

        const info = document.createElement('div');
        info.classList.add('info');

        const titolo = document.createElement('span');
        titolo.textContent = d.title;

        const meta = document.createElement('p');
        meta.classList.add('meta');
        meta.textContent = `${autore} - ${anno}`;

        info.append(titolo, meta);

        // Il bottone "Aggiungi" porta con sé i dati nei data-attribute,
        // così il click delegato (passo 13) potrà leggerli.
        const bottone = document.createElement('button');
        bottone.type = 'button';
        bottone.textContent = 'Aggiungi';
        bottone.dataset.titolo = d.title;
        bottone.dataset.autore = autore;
        bottone.dataset.anno = anno;

        // Se il libro è già in libreria, il bottone nasce già disabilitato con la spunta
        if (giaInLibreria(d.title, autore)) {
            segnaAggiunto(bottone);
        }

        li.append(info, bottone);
        return li;
    });

    risultati.replaceChildren(...righe);
}

// Controlla se un libro (stesso titolo + stesso autore) è già in libreria
function giaInLibreria(titolo, autore) {
    return libri.some((l) =>
        l.titolo.toLowerCase() === titolo.toLowerCase() &&
        l.autore.toLowerCase() === autore.toLowerCase()
    );
}

// Mette il bottone nello stato "✓ Aggiunto" (riusata in due punti)
function segnaAggiunto(bottone) {
    bottone.textContent = '\u2713 Aggiunto';
    bottone.disabled = true;
}


// === Eventi ===

//change al campo hidden
selectFormato.addEventListener('change', (e) => {
    e.preventDefault();

    if (e.target.value === 'digitale') {
        campoDimensione.hidden = false;
    } else {
        campoDimensione.hidden = true;
    }
});

//submit del form

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const dati = Object.fromEntries(new FormData(e.target));
    //new FormData(form) legge tutti i campi (grazie agli attributi
    //"name"); Object.fromEntries lo trasforma in un oggetto

    const anno = Number(dati.anno);
    const dimensioneMb = Number(dati.dimensioneMb);

    let nuovo;
    if (dati.formato === "digitale") {
        nuovo = new LibroDigitale(dati.titolo, dati.autore, anno, dimensioneMb);
    } else {
        nuovo = new Libro(dati.titolo, dati.autore, anno);
    }

    libri.push(nuovo);
    salvaLibri();
    renderLibri();

    e.target.reset();
    campoDimensione.hidden = true;
});


listaLibri.addEventListener("click", (e) => {
    // closest() risale dall'elemento cliccato verso l'alto cercando
    // un elemento che corrisponda al selettore. Se hai cliccato su
    // qualcosa che non è un bottone "leggi", restituisce null.
    const bottone = e.target.closest("[data-azione]");
    if (!bottone) return;

    const id = bottone.closest("li").dataset.id;
    const azione = bottone.dataset.azione;

    if (azione === "leggi") {
        const libro = libri.find((l) => l.id === id);
        libro.segnaComeLetto();
    } else if (azione === "rimuovi") {
        libri = libri.filter((l) => l.id !== id);
    }

    salvaLibri();

    if (ultimiDocs.length) renderRisultati(ultimiDocs);

    renderLibri();

});

svuotaTutto.addEventListener("click", () => {
    if (confirm('Sei sicuro di voler cancellare tutto il contenuto?')) {
        libri = [];
        localStorage.removeItem(STORAGE_KEY);

        renderLibri();

        //Se ci sono risultati di ricerca visibili, ricaricali 
        //per riabilitare i bottoni "Aggiungi"
        if (ultimiDocs.length > 0) {
            renderRisultati(ultimiDocs);
        }
    }
});

// === Eventi input e aggiungi ===

let timeoutId;

inputCerca.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    // Cancelliamo sempre il timer precedente (anche nel caso "troppo
    // corto", così una ricerca già programmata non parte dopo aver
    // cancellato il testo).
    clearTimeout(timeoutId);

    // Meno di 3 caratteri: svuotiamo i risultati ed usciamo
    if (query.length < 3) {
        risultati.innerHTML = '';
        return;
    }

    timeoutId = setTimeout(() => cerca(query), 400);
});


risultati.addEventListener('click', (e) => {
    const bottone = e.target.closest('button[data-titolo]');
    if (!bottone) return;

    // Leggiamo i dati salvati nei data-attribute (passo 10)
    const { titolo, autore, anno } = bottone.dataset;

    // Number("?") è NaN, quindi "|| 0" dà 0 come anno di ripiego
    const nuovo = new Libro(titolo, autore, Number(anno) || 0);

    libri.push(nuovo);
    salvaLibri();
    renderLibri();

    // Feedback visivo: bottone disabilitato per evitare doppi inserimenti
    segnaAggiunto(bottone);
});

renderLibri();
