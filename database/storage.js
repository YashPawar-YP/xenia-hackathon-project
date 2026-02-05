const DB_KEY ="club-event-db"

export const initDB = () => {
    if (!localstorage.getItem(DB_KEY)){
        localStorage.setItem(
            DB_KEY,
            JSON.stringify({
                users : [],
                clubs : [],
                events: []

            })
        );
    }
};

export const getDB= () => {
    return JSON.parse(localStorage.getItem(DB_KEY));
};

export const saveDB = (db) => {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
};

