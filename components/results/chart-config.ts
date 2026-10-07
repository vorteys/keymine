// Réglages du graphique du MPM, dans un module sans « use client » pour que la page serveur
// puisse lire les mêmes valeurs que le composant.

/**
 * Les premières secondes sont masquées : le MPM est une moyenne depuis le départ, donc une seule
 * rafale de 15 caractères en 1 s donne « 180 MPM » et écrase l'échelle du graphique.
 */
export const HIDDEN_FIRST_SECONDS = 3;
