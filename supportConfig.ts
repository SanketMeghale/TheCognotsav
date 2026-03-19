
export interface SupportMember {
  name: string;
  phone: string;
}

export const GENERAL_SUPPORT: SupportMember[] = [
  { name: "Siddhi Pagire", phone: "9421329709" },
  { name: "Abhijeet Saykad", phone: "9309111799" },
  { name: "Siddhi Deshpande", phone: "8421981038" },
];

export const EVENT_SUPPORT_MAPPING: Record<string, SupportMember[]> = {
  "tech-kbc": [
    { name: "Sahil Bhatti", phone: "9028313750" },
    { name: "Omkar Bendre", phone: "9359071534" },
  ],
  "bgmi-esports": [
    { name: "Sanket Meghale", phone: "9356776307" },
  ],
  "ff-esports": [
    { name: "Sanket Meghale", phone: "9356776307" },
  ],
  "squid-game": [
    { name: "Tejaswini Gangurde", phone: "9890959580" },
    { name: "Om Rakshe", phone: "9371344628" },
  ],
  "rang-manch": [
    { name: "Sayli Anandkar", phone: "8668922831" },
    { name: "Nikita Adsul", phone: "8669948742" },
  ],
  "googler-hunt": [
    { name: "Harshal Gosavi", phone: "9552843975" },
    { name: "Aditya Gagare", phone: "7558394479" },
  ],
  "techxcelerate": [
    { name: "Prerna C.", phone: "8767927244" },
    { name: "Akshay Kawade", phone: "9766205339" },
  ],
  "utopia": [
    { name: "Deepika Nikam", phone: "7276062794" },
    { name: "Siddhi Deshpande", phone: "7620322275" },
    { name: "Trupti Jadhav", phone: "9850560091" },
  ],
};
