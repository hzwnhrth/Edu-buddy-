import { uniqueTopicIds } from "@/lib/ai/text";
import type { Topic } from "@/lib/types";

// Bundled sample notes for the "Try sample notes" action on the Dashboard
// and Upload screens. Written from scratch for EduBuddy; not copied from
// any existing source. The marker line at the top of the text lets the
// mock AI recognise this exact material and return its pre-computed
// topics instead of guessing from headings; with real Gemini configured,
// the text is analysed live like any other notes and the marker is just
// a harmless first line.

export const SAMPLE_MARKER = "EduBuddy sample notes";

const SAMPLE_TITLE = "How the Internet Works: A First Tour";

const SAMPLE_TEXT = `${SAMPLE_MARKER}

${SAMPLE_TITLE}

These notes give a first-year tour of how information travels across the internet, from raw addresses up to the padlock icon in a browser. Five short sections build on each other: addresses and packets, name lookup, page requests, delivery methods, and privacy.

IP addresses and packets

Every device connected to the internet needs an address, called an IP address. An IP address tells the network exactly which device a message is going to and which device it came from.

Data does not travel across the internet as one long stream. Instead, it is broken up into small pieces called packets before it is sent. Each packet carries a copy of the sender's address and the receiver's address, plus a small slice of the whole message. A large file might be split into thousands of packets.

Packets do not all have to take the same route. Routers are the devices that read the destination address on each packet and forward it toward that address, one step at a time. Because conditions on the network change from moment to moment, packets from the same message can travel by different paths and arrive out of order. The receiving device puts the packets back in the correct order before handing the finished message to whatever program asked for it.

There are two address formats in common use today. IPv4 addresses are written as four numbers separated by dots, such as 192.168.1.1. IPv6 addresses are longer, and the format was introduced because the world was running low on IPv4 addresses to hand out.

For example, sending one photo from a phone to a messaging app might split the photo into a few hundred packets. Each packet carries the phone's address and the app's server address. The packets can pass through several different routers, possibly in different cities, before they all arrive and are put back together into the photo that appears on the screen.

DNS: finding the right server

Typing a web address like example.com into a browser is easy for a person to remember. Computers do not use names like that to find each other; they use IP addresses instead. DNS, short for Domain Name System, is the system that turns a readable name into the correct IP address.

DNS works like a phone book for the internet, except the lookup happens automatically in the background. When a browser needs to reach example.com, it asks a DNS resolver, usually run by an internet provider or a public resolver service. The resolver checks whether it already knows the answer. If not, it asks other DNS servers further up the chain until it finds the server responsible for that name.

Once the correct IP address is found, the resolver sends it back to the browser, and the browser can open a connection to that address. This whole process usually takes a tiny fraction of a second, before a page even starts loading.

To avoid repeating this lookup constantly, resolvers cache the answer for a while. If the same name is requested again soon after, the resolver can answer immediately from its cache instead of asking the network again. Cached answers expire after a set time, so visitors pick up a new address once the old cached entry expires.

For example, a student typing library.example.edu into a browser for the first time on campus sends the browser's resolver looking for an answer it does not have yet. A few DNS servers pass the request along, one of them replies with the correct address, and the resolver remembers that answer, so opening the same site again later that day is faster.

HTTP: how browsers ask for pages

Once a browser knows the IP address of a website, it needs a shared language to actually ask for a page. That shared language is called HTTP, short for HyperText Transfer Protocol.

An HTTP request is a short, structured message. It states what the browser wants, usually to fetch a specific page or file, and it includes the address of that resource on the server. The server reads the request, decides how to respond, and sends back an HTTP response.

Every HTTP response carries a status code, a short number that tells the browser what happened. A code in the 200s usually means success and the page is included in the response. A code in the 300s usually means the page has moved elsewhere. A code in the 400s usually means the browser asked for something that does not exist. A code in the 500s usually means the server itself ran into a problem.

A single web page is rarely just one request. Loading a page with images, fonts and scripts on it usually means the browser sends out many separate HTTP requests, then assembles everything into what appears on screen.

For example, a browser opening a news website first sends an HTTP request for the main page. The response includes the text of the page along with links to a header image and a stylesheet. The browser then sends two more HTTP requests, one for the image and one for the stylesheet, and combines all three responses into the finished page the reader sees.

TCP and UDP: reliable or fast

Packets need a set of rules for how they are sent, checked, and resent if needed. Two of the most common rule sets are called TCP and UDP, and they make different trade-offs between reliability and speed.

TCP, short for Transmission Control Protocol, is built around reliability. Before sending data, the two devices agree to a connection. Every packet is numbered, and the receiving device confirms which packets arrived. If a packet goes missing or arrives damaged, TCP notices and asks for it to be sent again. TCP puts packets back in the correct order before passing the data along. This makes TCP a good fit for loading a web page or sending an email, where a missing piece would break the result.

UDP, short for User Datagram Protocol, is built around speed instead. It sends packets without first setting up a connection and without confirming that each one arrived. If a packet is lost, UDP does not resend it, it simply moves on. This makes UDP faster and lighter than TCP.

Because of this trade-off, the two are used for different jobs. Loading a web page normally relies on TCP, since a browser needs every byte of a page to arrive correctly. A live video call is a common use of UDP, since a dropped frame is far less noticeable than the whole call freezing while the app waits for a resend.

For example, streaming a live sports match typically uses UDP so the picture keeps moving smoothly even if a few frames are imperfect. Downloading the highlights afterwards as a saved file typically uses TCP, so the saved file is complete and free of missing pieces.

HTTPS: keeping the conversation private

Plain HTTP sends its requests and responses as readable text. Anyone who can see the traffic between a browser and a server, such as someone sharing the same public wifi network, could potentially read it or change it along the way. HTTPS solves this by adding a layer of encryption on top of HTTP.

The S in HTTPS stands for secure. Before any page data is exchanged, the browser and the server perform a handshake: they agree on an encryption method and exchange the information needed to scramble and unscramble the data that follows. From that point on, everything sent between the browser and the server is encrypted, so anyone intercepting the traffic sees only scrambled data instead of readable text.

HTTPS also checks that the server is genuinely who it claims to be. Servers use a certificate, issued by a trusted organisation, to prove their identity as part of the handshake. If the certificate does not match the address the browser is trying to reach, or has expired, the browser warns the visitor instead of quietly connecting.

Browsers usually show a padlock icon next to the address bar when a connection is using HTTPS. Most websites that handle passwords, payments or personal information use HTTPS today.

For example, logging into an online banking site over HTTPS means the password typed into the login form is encrypted before it leaves the browser. Even if someone were watching the same network traffic, they would see only scrambled data rather than the actual password.
`;

const TOPIC_NAMES = [
  "IP addresses and packets",
  "DNS: finding the right server",
  "HTTP: how browsers ask for pages",
  "TCP and UDP: reliable or fast",
  "HTTPS: keeping the conversation private",
];

const TOPIC_IDS = uniqueTopicIds(TOPIC_NAMES);

// Every key point below is a sentence taken directly from SAMPLE_TEXT, so
// each one is genuinely stated in the notes, not just plausible-sounding.
const SAMPLE_TOPICS: Topic[] = [
  {
    id: TOPIC_IDS[0],
    name: TOPIC_NAMES[0],
    summary:
      "Every device on the internet has an IP address, and messages travel as small packets that routers forward toward that address.",
    keyPoints: [
      "Every device connected to the internet needs an address, called an IP address.",
      "Data does not travel across the internet as one long stream.",
      "Routers are the devices that read the destination address on each packet and forward it toward that address, one step at a time.",
      "IPv6 addresses are longer, and the format was introduced because the world was running low on IPv4 addresses to hand out.",
    ],
  },
  {
    id: TOPIC_IDS[1],
    name: TOPIC_NAMES[1],
    summary:
      "DNS turns a readable website name into the IP address a browser needs, working like an automatic phone book for the internet.",
    keyPoints: [
      "DNS, short for Domain Name System, is the system that turns a readable name into the correct IP address.",
      "DNS works like a phone book for the internet, except the lookup happens automatically in the background.",
      "To avoid repeating this lookup constantly, resolvers cache the answer for a while.",
      "Cached answers expire after a set time, so visitors pick up a new address once the old cached entry expires.",
    ],
  },
  {
    id: TOPIC_IDS[2],
    name: TOPIC_NAMES[2],
    summary:
      "HTTP is the shared language browsers and servers use to request and deliver pages, with status codes describing what happened.",
    keyPoints: [
      "That shared language is called HTTP, short for HyperText Transfer Protocol.",
      "Every HTTP response carries a status code, a short number that tells the browser what happened.",
      "A code in the 200s usually means success and the page is included in the response.",
      "A single web page is rarely just one request.",
    ],
  },
  {
    id: TOPIC_IDS[3],
    name: TOPIC_NAMES[3],
    summary:
      "TCP and UDP are two ways to send packets: TCP checks that everything arrives correctly, while UDP favours speed over resending lost data.",
    keyPoints: [
      "TCP, short for Transmission Control Protocol, is built around reliability.",
      "Every packet is numbered, and the receiving device confirms which packets arrived.",
      "UDP, short for User Datagram Protocol, is built around speed instead.",
      "Loading a web page normally relies on TCP, since a browser needs every byte of a page to arrive correctly.",
    ],
  },
  {
    id: TOPIC_IDS[4],
    name: TOPIC_NAMES[4],
    summary:
      "HTTPS adds encryption and identity checks on top of HTTP so the data exchanged between a browser and a server stays private.",
    keyPoints: [
      "HTTPS solves this by adding a layer of encryption on top of HTTP.",
      "The S in HTTPS stands for secure.",
      "Servers use a certificate, issued by a trusted organisation, to prove their identity as part of the handshake.",
      "Browsers usually show a padlock icon next to the address bar when a connection is using HTTPS.",
    ],
  },
];

export interface SampleNotes {
  title: string;
  sourceName: "sample";
  pageCount: 0;
  text: string;
  topics: Topic[];
}

export const SAMPLE_NOTES: SampleNotes = {
  title: SAMPLE_TITLE,
  sourceName: "sample",
  pageCount: 0,
  text: SAMPLE_TEXT,
  topics: SAMPLE_TOPICS,
};
