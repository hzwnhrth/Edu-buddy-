// The bundled quiz decks the Quiz Arena offers. A deck is a fixed,
// curated question bank with stable question ids, because the spaced-
// repetition scheduler stores per-question progress in localStorage keyed
// by those ids. Adding a deck here makes it selectable in the Quiz Arena.

export interface BankQuestion {
  qid: string;
  stem: string;
  options: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface QuizBank {
  id: string;
  subject: string;
  title: string;
  topicId: string;
  topicName: string;
  questions: BankQuestion[];
}

// Curated from Buku Teks Sejarah Tingkatan 4, Bab 1: kemunculan negara
// bangsa dan pentadbiran Kesultanan Melayu Melaka.
export const QUIZ_BANKS: QuizBank[] = [
  {
    id: "teks-sejarah-t4",
    subject: "Sejarah",
    title: "Buku Teks Sejarah T4 — Bab 1",
    topicId: "sejarah-t4-bab-1",
    topicName: "Sejarah T4 Bab 1",
    questions: [
      {
        qid: "sejarah-t4-q1",
        stem: "Apakah ciri-ciri negara bangsa Kerajaan Alam Melayu sebelum kedatangan Barat?",
        options: ["Raja, undang-undang, wilayah pengaruh dan rakyat", "Parlimen, kabinet, pilihan raya dan rakyat", "Sultan, pelabuhan, tentera dan mata wang", "Keluarga, agama, ekonomi dan pendidikan"],
        answerIndex: 0,
        explanation: "Ciri-ciri negara bangsa Kerajaan Alam Melayu ialah raja, undang-undang, wilayah pengaruh dan rakyat.",
      },
      {
        qid: "sejarah-t4-q2",
        stem: "Apakah sistem pentadbiran yang menjadi tonggak pentadbiran Kesultanan Melayu Melaka?",
        options: ["Sistem Pembesar Enam Belas Lipatan", "Sistem Pembesar Empat Lipatan", "Sistem Pembesar Berpusat", "Sistem Pentadbiran Jajahan"],
        answerIndex: 1,
        explanation: "Sistem Pembesar Empat Lipatan menjadikan pentadbiran Kesultanan Melayu Melaka tersusun dan lancar.",
      },
      {
        qid: "sejarah-t4-q3",
        stem: "Antara berikut, yang manakah dua undang-undang bertulis pada zaman Kesultanan Melayu Melaka?",
        options: ["Undang-Undang Pahang dan Undang-Undang 99 Perak", "Hukum Kanun Pahang dan Kanun Majapahit", "Hukum Kanun Melaka dan Undang-Undang Laut Melaka", "Undang-Undang Adat Melaka dan Undang-Undang Pelabuhan"],
        answerIndex: 2,
        explanation: "Kesultanan Melayu Melaka menggunakan Hukum Kanun Melaka dan Undang-Undang Laut Melaka.",
      },
      {
        qid: "sejarah-t4-q4",
        stem: "Apakah peranan Temenggung dalam sistem pentadbiran Kesultanan Melayu Melaka?",
        options: ["Menguruskan perbendaharaan", "Menjadi panglima angkatan laut", "Menjadi ketua pentadbir dan pemangku sultan", "Menjaga keselamatan kota Melaka"],
        answerIndex: 3,
        explanation: "Temenggung bertanggungjawab menjaga keselamatan kota Melaka, manakala Laksamana menjadi panglima angkatan laut.",
      },
      {
        qid: "sejarah-t4-q5",
        stem: "Apakah maksud waadat dalam hubungan pemerintah dengan rakyat?",
        options: ["Perjanjian antara golongan pemerintah dengan golongan diperintah", "Hukuman terhadap rakyat yang menderhaka", "Upacara pertabalan seseorang sultan", "Cukai yang dikenakan di pelabuhan"],
        answerIndex: 0,
        explanation: "Waadat ialah perjanjian antara Demang Lebar Daun yang mewakili golongan diperintah dengan Sang Sapurba yang mewakili golongan pemerintah.",
      },
      {
        qid: "sejarah-t4-q6",
        stem: "Siapakah pembesar yang mengetuai pentadbiran Kesultanan Melayu Melaka selepas sultan?",
        options: ["Bendahara", "Temenggung", "Laksamana", "Penghulu Bendahari"],
        answerIndex: 0,
        explanation: "Bendahara ialah pembesar tertinggi yang mengetuai pentadbiran selepas sultan dan memangku sultan ketika baginda tiada.",
      },
      {
        qid: "sejarah-t4-q7",
        stem: "Apakah faktor utama yang menjadikan Melaka pusat perdagangan antarabangsa pada abad ke-15?",
        options: ["Sumber hasil bumi yang pelbagai", "Kedudukan yang strategik di Selat Melaka", "Sokongan tentera darat yang besar", "Penggunaan mata wang emas dan perak"],
        answerIndex: 1,
        explanation: "Kedudukan Melaka yang strategik di Selat Melaka memudahkan kapal dagang dari Timur dan Barat berlabuh di situ.",
      },
      {
        qid: "sejarah-t4-q8",
        stem: "Selepas memeluk Islam, Parameswara dikenali dengan nama yang baharu, iaitu",
        options: ["Sultan Muzaffar Syah", "Sultan Mansur Syah", "Sultan Muhammad Syah", "Sultan Alauddin Riayat Syah"],
        answerIndex: 2,
        explanation: "Parameswara memeluk Islam setelah berkahwin dengan puteri Raja Samudera Pasai dan menukar namanya kepada Sultan Muhammad Syah.",
      },
      {
        qid: "sejarah-t4-q9",
        stem: "Apakah maksud daulat dalam konsep kedaulatan negara bangsa Melayu?",
        options: ["Kekuasaan raja untuk mengenakan cukai", "Kebesaran dan keagungan yang dimiliki seseorang raja", "Kemampuan raja menakluk negeri lain", "Kesetiaan rakyat kepada pembesar"],
        answerIndex: 1,
        explanation: "Daulat ialah kebesaran dan keagungan yang dimiliki oleh seseorang raja, dan rakyat wajib taat setia kepadanya.",
      },
      {
        qid: "sejarah-t4-q10",
        stem: "Kitab manakah yang merakamkan sejarah awal Kesultanan Melayu Melaka?",
        options: ["Hikayat Hang Tuah", "Sulalatus Salatin", "Misa Melayu", "Hikayat Abdullah"],
        answerIndex: 1,
        explanation: "Sulalatus Salatin atau Sejarah Melayu merakamkan salasilah dan sejarah awal Kesultanan Melayu Melaka.",
      },
    ],
  },
];
