// The bundled quiz decks the Quiz Arena offers. A deck is a fixed,
// curated question bank with stable question ids, because the spaced-
// repetition scheduler stores per-question progress in localStorage keyed
// by those ids. Adding a deck here makes it selectable in the Quiz Arena,
// and adding it to the mixed deck option mixes it into one quiz.

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

// One selectable entry on the start screen: a single chapter, or the mix
// of every chapter. `banks` is what a session draws from.
export interface DeckOption {
  id: string;
  subject: string;
  title: string;
  banks: QuizBank[];
}

// Curated from Buku Teks Sejarah Tingkatan 4: Bab 1 (kemunculan negara
// bangsa dan pentadbiran Kesultanan Melayu Melaka), Bab 2 (kebangkitan
// nasionalisme) and Bab 3 (konflik dunia dan pendudukan Jepun).
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
  {
    id: "teks-sejarah-t4-b2",
    subject: "Sejarah",
    title: "Buku Teks Sejarah T4 — Bab 2",
    topicId: "sejarah-t4-bab-2",
    topicName: "Bab 2: Kebangkitan Nasionalisme",
    questions: [
      {
        qid: "sejarah-t4-b2-q1",
        stem: "Apakah maksud nasionalisme?",
        options: ["Cinta mendalam terhadap bangsa dan negara", "Kepatuhan mutlak kepada pemerintah asing", "Persaingan ekonomi antara negara", "Kekuasaan mutlak seseorang raja"],
        answerIndex: 0,
        explanation: "Nasionalisme bermaksud cinta mendalam terhadap bangsa dan negara serta gerakan mencapai kebebasan politik, ekonomi dan sosial daripada penguasaan orang asing.",
      },
      {
        qid: "sejarah-t4-b2-q2",
        stem: "Mengapakah revolusi di England pada tahun 1688 dikenali sebagai Revolusi Keagungan?",
        options: ["Ia menggulingkan raja melalui kekerasan", "Peralihan kuasa berlaku secara aman tanpa pertumpahan darah", "Ia ditaja sepenuhnya oleh golongan bangsawan", "Ia menamatkan sistem pemerintahan beraja di England"],
        answerIndex: 1,
        explanation: "Revolusi Keagungan dikenali demikian kerana peralihan kuasa daripada Raja James II kepada Mary II dan William of Orange berlaku secara aman tanpa pertumpahan darah.",
      },
      {
        qid: "sejarah-t4-b2-q3",
        stem: "Siapakah penulis Perisytiharan Kemerdekaan Amerika pada tahun 1776?",
        options: ["George Washington", "John Locke", "Thomas Jefferson", "Jean Jacques Rousseau"],
        answerIndex: 2,
        explanation: "Perisytiharan Kemerdekaan Amerika ditulis oleh Thomas Jefferson dan diluluskan oleh kongres yang diketuai oleh George Washington pada Julai 1776.",
      },
      {
        qid: "sejarah-t4-b2-q4",
        stem: "Karya The Social Contract yang mengemukakan keunggulan suara rakyat atau 'hasrat umum' ditulis oleh",
        options: ["Voltaire", "Jean Jacques Rousseau", "John Locke", "Thomas Jefferson"],
        answerIndex: 1,
        explanation: "Jean Jacques Rousseau menulis The Social Contract yang mengemukakan kedaulatan suara rakyat sebagai lebih penting daripada institusi raja.",
      },
      {
        qid: "sejarah-t4-b2-q5",
        stem: "Gerakan Islah di Mesir telah dipelopori oleh",
        options: ["Sayyid Jamal al-Din al-Afghani dan Sheikh Muhammad Abduh", "Mahatma Gandhi dan Jawaharlal Nehru", "Dr. Sun Yat Sen dan Jose Rizal", "Sultan Mahmud Shah dan Bendahara Tun Perak"],
        answerIndex: 0,
        explanation: "Gerakan Islah atau gerakan pemulihan Islam dipelopori oleh Sayyid Jamal al-Din al-Afghani dan Sheikh Muhammad Abduh bagi menentang imperialisme Barat.",
      },
      {
        qid: "sejarah-t4-b2-q6",
        stem: "Gerakan pemulihan yang dilancarkan oleh Maharaja Mikado Meiji di Jepun menekankan",
        options: ["Penubuhan empayar di Asia Tenggara", "Pemodenan mengikut model Barat", "Gerakan Islah berasaskan al-Quran dan Hadis", "Penentangan terhadap Dinasti Manchu"],
        answerIndex: 1,
        explanation: "Maharaja Mikado Meiji melancarkan Pemulihan Meiji dengan menekankan pemodenan mengikut model Barat supaya Jepun dihormati oleh kuasa Barat.",
      },
      {
        qid: "sejarah-t4-b2-q7",
        stem: "Pertubuhan yang ditubuhkan oleh Andres Bonifacio bagi mendapatkan kemerdekaan Filipina melalui revolusi ialah",
        options: ["Liga Filipina", "Gerakan Propaganda", "Katipunan", "Parti Nasionalis"],
        answerIndex: 2,
        explanation: "Andres Bonifacio menubuhkan Katipunan, gerakan revolusioner yang berhasrat menghapuskan pemerintahan Sepanyol di Filipina.",
      },
      {
        qid: "sejarah-t4-b2-q8",
        stem: "Ikrar Sumpah Pemuda 1928 di Indonesia menuntut satu tanah air, satu bangsa dan",
        options: ["satu agama", "satu kepimpinan", "satu kerajaan", "satu bahasa"],
        answerIndex: 3,
        explanation: "Sumpah Pemuda pada tahun 1928 menjadi tonggak nasionalisme Indonesia dengan ikrar satu tanah air, satu bangsa dan satu bahasa, iaitu bahasa Indonesia.",
      },
      {
        qid: "sejarah-t4-b2-q9",
        stem: "Nasionalisme di Thailand berbeza daripada negara Asia Tenggara yang lain kerana bertujuan",
        options: ["menentang pemerintahan beraja", "mendapatkan kemerdekaan daripada Sepanyol", "mengekalkan kedaulatan negara", "membentuk gagasan Melayu Raya"],
        answerIndex: 2,
        explanation: "Nasionalisme di Thailand bertujuan mempertahankan kedaulatan negara serta menuntut penglibatan rakyat dalam pemerintahan, bukan menentang penjajahan.",
      },
      {
        qid: "sejarah-t4-b2-q10",
        stem: "Kesatuan Melayu Muda (KMM) yang ditubuhkan oleh Ibrahim Haji Yaakob berhasrat mewujudkan gagasan",
        options: ["Melayu Raya", "Pan-Islamisme", "Semenanjung Bebas", "Asia Timur Raya"],
        answerIndex: 0,
        explanation: "KMM berhasrat menentang British dan mewujudkan gagasan Melayu Raya melalui gabungan Tanah Melayu dan Indonesia.",
      },
    ],
  },
  {
    id: "teks-sejarah-t4-b3",
    subject: "Sejarah",
    title: "Buku Teks Sejarah T4 — Bab 3",
    topicId: "sejarah-t4-bab-3",
    topicName: "Bab 3: Konflik Dunia dan Pendudukan Jepun",
    questions: [
      {
        qid: "sejarah-t4-b3-q1",
        stem: "Kemuncak krisis rantau Balkan yang mencetuskan Perang Dunia Pertama ialah",
        options: ["pencerobohan Belgium oleh Jerman", "pembunuhan Archduke Ferdinand, Putera Mahkota Austria-Hungary", "penggubalan Bill of Rights", "penubuhan Liga Bangsa-Bangsa"],
        answerIndex: 1,
        explanation: "Perang Dunia Pertama tercetus selepas pembunuhan Archduke Ferdinand, Putera Mahkota Austria-Hungary dan isterinya oleh seorang pemuda Serbia.",
      },
      {
        qid: "sejarah-t4-b3-q2",
        stem: "Perjanjian yang dikehendaki Jerman menerima syarat perdamaian berat selepas Perang Dunia Pertama ialah",
        options: ["Perjanjian Paris", "Deklarasi 14 Perkara", "Perjanjian Versailles", "Perisytiharan D-Day"],
        answerIndex: 2,
        explanation: "Perjanjian Versailles memerlukan Jerman bertanggungjawab terhadap kemusnahan perang, membayar pampasan, menghadkan tentera dan menyerahkan wilayahnya.",
      },
      {
        qid: "sejarah-t4-b3-q3",
        stem: "Ideologi yang dipimpin oleh Adolf Hitler dan parti Nazi di Jerman ialah",
        options: ["fasisme", "komunisme", "nazisme", "republikanisme"],
        answerIndex: 2,
        explanation: "Nazisme di bawah pimpinan Adolf Hitler mengagungkan bangsa Jerman dan berusaha memulihkan nasionalisme Jerman dengan mengetepikan Perjanjian Versailles.",
      },
      {
        qid: "sejarah-t4-b3-q4",
        stem: "Perang Dunia Kedua di Asia Pasifik bermula apabila Jepun menyerang",
        options: ["Normandy dan Stalingrad", "Tanah Melayu dan Pearl Harbour", "Hong Kong dan Indochina", "Manchuria dan Korea"],
        answerIndex: 1,
        explanation: "Pada 8 Disember 1941, Jepun menyerang Tanah Melayu di Kota Bharu, Kelantan dan pangkalan tentera laut Amerika Syarikat di Pearl Harbour, Hawaii.",
      },
      {
        qid: "sejarah-t4-b3-q5",
        stem: "Sasaran utama Jepun di Sarawak bagi memenuhi keperluan perindustrian dan ketenteraannya ialah sumber",
        options: ["bijih timah dan getah", "emas dan arang batu", "minyak di Miri dan Lutong", "bauksit dan bijih besi"],
        answerIndex: 2,
        explanation: "Sasaran utama Jepun di Sarawak ialah sumber minyak, terutama di Miri dan Lutong, bagi keperluan perindustrian dan operasi ketenteraan.",
      },
      {
        qid: "sejarah-t4-b3-q6",
        stem: "Nama yang diberikan oleh pentadbiran tentera Jepun kepada Singapura ialah",
        options: ["Malai", "Syonan-to", "Kita Boruneo", "Shonan Marai"],
        answerIndex: 1,
        explanation: "Singapura dikenali sebagai Syonan-to atau Pulau Cahaya Selatan, manakala Tanah Melayu dikenali sebagai Malai.",
      },
      {
        qid: "sejarah-t4-b3-q7",
        stem: "Apakah kesan pencetakan mata wang Jepun atau 'wang pokok pisang' tanpa kawalan?",
        options: ["Pertumbuhan ekonomi yang pesat", "Kestabilan harga barang", "Kekurangan tenaga buruh", "Inflasi yang teruk"],
        answerIndex: 3,
        explanation: "Mata wang Jepun dicetak tanpa kawalan menyebabkan inflasi kerana terlalu banyak wang tetapi kekurangan barangan di pasaran.",
      },
      {
        qid: "sejarah-t4-b3-q8",
        stem: "Wanita yang dianugerahi Pingat King George kerana keberaniannya membantu gerila anti-Jepun di Perak ialah",
        options: ["Ibu Zain", "Sybil Kathigasu", "Kartini", "Fatimah Yaakub"],
        answerIndex: 1,
        explanation: "Sybil Kathigasu, seorang jururawat di Ipoh, dianugerahi Pingat King George kerana memberikan bantuan perubatan dan maklumat kepada gerila anti-Jepun.",
      },
      {
        qid: "sejarah-t4-b3-q9",
        stem: "Matlamat penubuhan Kesatuan Rakyat Indonesia Semenanjung (KRIS) ialah",
        options: ["menubuhkan kerajaan republik di Sarawak", "mempertahankan kedaulatan Siam", "mendapatkan kemerdekaan Tanah Melayu bersama Indonesia", "menentang gerakan Bintang Tiga"],
        answerIndex: 2,
        explanation: "KRIS ditubuhkan dengan sokongan Jepun bagi menuntut kemerdekaan Tanah Melayu bersama-sama dengan Indonesia, namun gagal kerana Jepun menyerah kalah.",
      },
      {
        qid: "sejarah-t4-b3-q10",
        stem: "Kelewatan pendaratan semula tentera British selepas Jepun menyerah kalah menyebabkan penguasaan oleh",
        options: ["Bintang Tiga", "Force 136", "Kempeitai", "Tentera Selempang Merah"],
        answerIndex: 0,
        explanation: "Kekosongan kuasa selepas penyerahan kalah Jepun digunakan oleh Bintang Tiga (PKM melalui MPAJA) untuk mengambil alih penguasaan di Tanah Melayu selama kira-kira 14 hari.",
      },
    ],
  },
];

// What the Quiz Arena start screen lists: each chapter on its own, then the
// mix of every chapter in one quiz.
export const DECK_OPTIONS: DeckOption[] = [
  ...QUIZ_BANKS.map((bank) => ({
    id: bank.id,
    subject: bank.subject,
    title: bank.title,
    banks: [bank],
  })),
  {
    id: "teks-sejarah-t4-semua",
    subject: "Campuran",
    title: "Semua Bab (Bab 1-3)",
    banks: QUIZ_BANKS,
  },
];
