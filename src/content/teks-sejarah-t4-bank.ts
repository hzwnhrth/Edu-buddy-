import type { PublicQuestion } from "@/lib/api-types";

// Curated from the supplied Teks Sejarah T4 chapter: Warisan Negara Bangsa.
// The bank deliberately uses stable ids because the scheduler stores progress
// against each question in localStorage.
export const TEKS_SEJARAH_T4_BANK: PublicQuestion[] = [
  {
    qid: "sejarah-t4-q1",
    topicId: "warisan-negara-bangsa",
    stem: "Apakah ciri-ciri negara bangsa Kerajaan Alam Melayu sebelum kedatangan Barat?",
    options: ["Raja, undang-undang, wilayah pengaruh dan rakyat", "Parlimen, kabinet, pilihan raya dan rakyat", "Sultan, pelabuhan, tentera dan mata wang", "Keluarga, agama, ekonomi dan pendidikan"],
    correctAnswerIndex: 0,
    explanation: "Ciri-ciri negara bangsa Kerajaan Alam Melayu ialah raja, undang-undang, wilayah pengaruh dan rakyat.",
  },
  {
    qid: "sejarah-t4-q2",
    topicId: "warisan-negara-bangsa",
    stem: "Apakah sistem pentadbiran yang menjadi tonggak pentadbiran Kesultanan Melayu Melaka?",
    options: ["Sistem Pembesar Enam Belas Lipatan", "Sistem Pembesar Empat Lipatan", "Sistem Pembesar Berpusat", "Sistem Pentadbiran Jajahan"],
    correctAnswerIndex: 1,
    explanation: "Sistem Pembesar Empat Lipatan menjadikan pentadbiran Kesultanan Melayu Melaka tersusun dan lancar.",
  },
  {
    qid: "sejarah-t4-q3",
    topicId: "warisan-negara-bangsa",
    stem: "Antara berikut, yang manakah dua undang-undang bertulis pada zaman Kesultanan Melayu Melaka?",
    options: ["Undang-Undang Pahang dan Undang-Undang 99 Perak", "Hukum Kanun Pahang dan Kanun Majapahit", "Hukum Kanun Melaka dan Undang-Undang Laut Melaka", "Undang-Undang Adat Melaka dan Undang-Undang Pelabuhan"],
    correctAnswerIndex: 2,
    explanation: "Kesultanan Melayu Melaka menggunakan Hukum Kanun Melaka dan Undang-Undang Laut Melaka.",
  },
  {
    qid: "sejarah-t4-q4",
    topicId: "warisan-negara-bangsa",
    stem: "Apakah peranan Temenggung dalam sistem pentadbiran Kesultanan Melayu Melaka?",
    options: ["Menguruskan perbendaharaan", "Menjadi panglima angkatan laut", "Menjadi ketua pentadbir dan pemangku sultan", "Menjaga keselamatan kota Melaka"],
    correctAnswerIndex: 3,
    explanation: "Temenggung bertanggungjawab menjaga keselamatan kota Melaka, manakala Laksamana menjadi panglima angkatan laut.",
  },
  {
    qid: "sejarah-t4-q5",
    topicId: "warisan-negara-bangsa",
    stem: "Apakah maksud waadat dalam hubungan pemerintah dengan rakyat?",
    options: ["Perjanjian antara golongan pemerintah dengan golongan diperintah", "Hukuman terhadap rakyat yang menderhaka", "Upacara pertabalan seseorang sultan", "Cukai yang dikenakan di pelabuhan"],
    correctAnswerIndex: 0,
    explanation: "Waadat ialah perjanjian antara Demang Lebar Daun yang mewakili golongan diperintah dengan Sang Sapurba yang mewakili golongan pemerintah.",
  },
];

export const TEKS_SEJARAH_T4_TITLE = "Teks Sejarah T4: Warisan Negara Bangsa";
