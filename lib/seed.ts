import type { Flight, Gate } from "./types";

const TODAY = new Date();
const iso = (h: number, m: number = 0) => {
  const d = new Date(TODAY);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const SEED_GATES: Gate[] = [
  { id: "G1", name: "G1", terminal: "T1", compatibleTypes: ["narrow", "regional"], hasJetBridge: true },
  { id: "G2", name: "G2", terminal: "T1", compatibleTypes: ["narrow", "regional"], hasJetBridge: true },
  { id: "G3", name: "G3", terminal: "T1", compatibleTypes: ["narrow", "regional"], hasJetBridge: true },
  { id: "G4", name: "G4", terminal: "T1", compatibleTypes: ["narrow", "regional"], hasJetBridge: true },
  { id: "G5", name: "G5", terminal: "T1", compatibleTypes: ["narrow", "wide", "regional"], hasJetBridge: true },
  { id: "G6", name: "G6", terminal: "T1", compatibleTypes: ["narrow", "wide", "regional"], hasJetBridge: true },
  { id: "G7", name: "G7 (Remote)", terminal: "T2", compatibleTypes: ["narrow", "regional"], hasJetBridge: false },
  { id: "G8", name: "G8 (Remote)", terminal: "T2", compatibleTypes: ["narrow", "regional"], hasJetBridge: false },
];

export const SEED_FLIGHTS: Flight[] = [
  { id: "f1", flightNumber: "6E 234", airline: "IndiGo", origin: "BOM", destination: "DEL", arrival: iso(6, 30), departure: iso(7, 45), aircraftType: "narrow", pax: 180 },
  { id: "f2", flightNumber: "AI 865", airline: "Air India", origin: "BLR", destination: "DEL", arrival: iso(7, 0), departure: iso(8, 15), aircraftType: "narrow", pax: 160 },
  { id: "f3", flightNumber: "UK 995", airline: "Vistara", origin: "HYD", destination: "DEL", arrival: iso(7, 15), departure: iso(8, 45), aircraftType: "narrow", pax: 170 },
  { id: "f4", flightNumber: "SG 145", airline: "SpiceJet", origin: "MAA", destination: "DEL", arrival: iso(8, 0), departure: iso(9, 30), aircraftType: "narrow", pax: 189 },
  { id: "f5", flightNumber: "EK 512", airline: "Emirates", origin: "DXB", destination: "DEL", arrival: iso(9, 0), departure: iso(11, 30), aircraftType: "wide", pax: 380 },
  { id: "f6", flightNumber: "AI 101", airline: "Air India", origin: "JFK", destination: "DEL", arrival: iso(9, 30), departure: iso(12, 0), aircraftType: "wide", pax: 340 },
  { id: "f7", flightNumber: "6E 512", airline: "IndiGo", origin: "CCU", destination: "DEL", arrival: iso(10, 15), departure: iso(11, 30), aircraftType: "narrow", pax: 180 },
  { id: "f8", flightNumber: "UK 815", airline: "Vistara", origin: "BOM", destination: "DEL", arrival: iso(11, 0), departure: iso(12, 15), aircraftType: "narrow", pax: 170 },
  { id: "f9", flightNumber: "QR 578", airline: "Qatar Airways", origin: "DOH", destination: "DEL", arrival: iso(12, 30), departure: iso(15, 0), aircraftType: "wide", pax: 360 },
  { id: "f10", flightNumber: "6E 745", airline: "IndiGo", origin: "GOI", destination: "DEL", arrival: iso(13, 45), departure: iso(15, 0), aircraftType: "narrow", pax: 180 },
  { id: "f11", flightNumber: "SG 220", airline: "SpiceJet", origin: "IXR", destination: "DEL", arrival: iso(14, 30), departure: iso(16, 0), aircraftType: "regional", pax: 80 },
  { id: "f12", flightNumber: "AI 560", airline: "Air India", origin: "PNQ", destination: "DEL", arrival: iso(15, 15), departure: iso(16, 30), aircraftType: "narrow", pax: 160 },
  { id: "f13", flightNumber: "BA 143", airline: "British Airways", origin: "LHR", destination: "DEL", arrival: iso(16, 0), departure: iso(19, 0), aircraftType: "wide", pax: 330 },
  { id: "f14", flightNumber: "6E 880", airline: "IndiGo", origin: "COK", destination: "DEL", arrival: iso(17, 45), departure: iso(19, 0), aircraftType: "narrow", pax: 180 },
  { id: "f15", flightNumber: "LH 761", airline: "Lufthansa", origin: "FRA", destination: "DEL", arrival: iso(18, 30), departure: iso(21, 0), aircraftType: "wide", pax: 340 },
];
