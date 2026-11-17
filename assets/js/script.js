
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

// === Render ===

function renderLibri() {
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
    renderLibri();

});


svuotaTutto.addEventListener("click", () => {
    if(confirm('Sei sicuro di voler cancellare tutto il contenuto?'))
    libri = [];
    localStorage.removeItem(STORAGE_KEY);
    renderLibri();
});

renderLibri();
