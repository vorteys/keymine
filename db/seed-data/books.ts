// Livres du domaine public du Project Gutenberg dont on tire des passages
// (`bun run db:import-corpus`). Les identifiants sont ceux de gutenberg.org/ebooks/<id> ;
// le script prévient si le titre n'apparaît pas dans le texte téléchargé (mauvais identifiant).
export type Book = { id: number; language: "fr" | "en"; title: string; author: string; check: string };

export const BOOKS: Book[] = [
  { id: 17941, language: "fr", title: "Fables, livre I", author: "Jean de La Fontaine", check: "FABLES" },
  { id: 29844, language: "fr", title: "Les Contemplations", author: "Victor Hugo", check: "CONTEMPLATIONS" },
  { id: 15112, language: "fr", title: "Poèmes saturniens", author: "Paul Verlaine", check: "SATURNIENS" },
  { id: 5097, language: "fr", title: "Vingt mille lieues sous les mers", author: "Jules Verne", check: "VINGT MILLE LIEUES" },
  { id: 14155, language: "fr", title: "Madame Bovary", author: "Gustave Flaubert", check: "BOVARY" },
  { id: 4650, language: "fr", title: "Candide", author: "Voltaire", check: "CANDIDE" },
  { id: 6099, language: "fr", title: "Les Fleurs du mal", author: "Charles Baudelaire", check: "FLEURS DU MAL" },
  { id: 13951, language: "fr", title: "Les Trois Mousquetaires", author: "Alexandre Dumas", check: "TROIS MOUSQUETAIRES" },
  { id: 5711, language: "fr", title: "Germinal", author: "Émile Zola", check: "GERMINAL" },
  { id: 1342, language: "en", title: "Pride and Prejudice", author: "Jane Austen", check: "PRIDE AND PREJUDICE" },
  { id: 98, language: "en", title: "A Tale of Two Cities", author: "Charles Dickens", check: "TALE OF TWO CITIES" },
  { id: 2701, language: "en", title: "Moby-Dick", author: "Herman Melville", check: "MOBY" },
  { id: 11, language: "en", title: "Alice's Adventures in Wonderland", author: "Lewis Carroll", check: "ALICE" },
  { id: 1661, language: "en", title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", check: "SHERLOCK HOLMES" },
  { id: 120, language: "en", title: "Treasure Island", author: "Robert Louis Stevenson", check: "TREASURE ISLAND" },
  { id: 36, language: "en", title: "The War of the Worlds", author: "H. G. Wells", check: "WAR OF THE WORLDS" },
  { id: 76, language: "en", title: "Adventures of Huckleberry Finn", author: "Mark Twain", check: "HUCKLEBERRY" },
  { id: 84, language: "en", title: "Frankenstein", author: "Mary Shelley", check: "FRANKENSTEIN" },
  { id: 174, language: "en", title: "The Picture of Dorian Gray", author: "Oscar Wilde", check: "DORIAN GRAY" },
  { id: 521, language: "en", title: "Robinson Crusoe", author: "Daniel Defoe", check: "CRUSOE" },
];
