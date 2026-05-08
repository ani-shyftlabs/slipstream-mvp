export type DirectoryEntry = {
  id: string;
  name: string;
  type: "MGA" | "Insurer";
  location: string;
  primary_lines: string[];
  min_premium: number;
  max_limit: number;
  appetite: "Aggressive" | "Moderate" | "Selective";
};

export const DIRECTORY: DirectoryEntry[] = [
  { id: "01", name: "AIG Insurance Canada", type: "Insurer", location: "Toronto, ON", primary_lines: ["Casualty","Property","Construction"], min_premium: 50000, max_limit: 25000000, appetite: "Moderate" },
  { id: "02", name: "Markel Canada", type: "Insurer", location: "Toronto, ON", primary_lines: ["Specialty","D&O","Cyber"], min_premium: 75000, max_limit: 15000000, appetite: "Aggressive" },
  { id: "03", name: "Trisura Group", type: "Insurer", location: "Toronto, ON", primary_lines: ["Casualty","Surety","Financial Lines"], min_premium: 100000, max_limit: 20000000, appetite: "Moderate" },
  { id: "04", name: "Liberty Mutual Canada", type: "Insurer", location: "Toronto, ON", primary_lines: ["Property","Casualty","Marine"], min_premium: 60000, max_limit: 30000000, appetite: "Moderate" },
  { id: "05", name: "Sovereign General Insurance", type: "Insurer", location: "Montreal, QC", primary_lines: ["Property","Casualty","Environmental"], min_premium: 40000, max_limit: 12000000, appetite: "Selective" },
  { id: "06", name: "Northbridge Insurance", type: "Insurer", location: "Toronto, ON", primary_lines: ["Commercial Property","Casualty","Professional Liability"], min_premium: 55000, max_limit: 18000000, appetite: "Moderate" },
  { id: "07", name: "Aspen Canada", type: "MGA", location: "Toronto, ON", primary_lines: ["Cyber","D&O","E&O"], min_premium: 85000, max_limit: 10000000, appetite: "Aggressive" },
  { id: "08", name: "Trinity Underwriting", type: "MGA", location: "Winnipeg, MB", primary_lines: ["Construction","Inland Marine","Equipment"], min_premium: 45000, max_limit: 8000000, appetite: "Moderate" },
  { id: "09", name: "Stewart Specialty", type: "MGA", location: "Vancouver, BC", primary_lines: ["Professional Liability","E&O","Management Liability"], min_premium: 65000, max_limit: 12000000, appetite: "Moderate" },
  { id: "10", name: "Signal Underwriting", type: "MGA", location: "Calgary, AB", primary_lines: ["Energy","Specialty Auto","Casualty"], min_premium: 120000, max_limit: 16000000, appetite: "Selective" },
  { id: "11", name: "Tripoint Underwriting", type: "MGA", location: "Toronto, ON", primary_lines: ["Construction","Course of Construction","Property"], min_premium: 80000, max_limit: 14000000, appetite: "Moderate" },
  { id: "12", name: "Echelon Insurance", type: "Insurer", location: "Montreal, QC", primary_lines: ["Specialty","Casualty","Life Sciences"], min_premium: 70000, max_limit: 11000000, appetite: "Moderate" },
  { id: "13", name: "Beneva", type: "Insurer", location: "Quebec City, QC", primary_lines: ["Property","Casualty","Affinity"], min_premium: 35000, max_limit: 9000000, appetite: "Moderate" },
  { id: "14", name: "Allmed Insurance", type: "MGA", location: "Toronto, ON", primary_lines: ["Healthcare","Professional Liability","D&O"], min_premium: 90000, max_limit: 7000000, appetite: "Aggressive" },
  { id: "15", name: "Lionsgate Insurance", type: "MGA", location: "Vancouver, BC", primary_lines: ["Marine","Inland Marine","Property"], min_premium: 55000, max_limit: 13000000, appetite: "Moderate" },
  { id: "16", name: "K&K Insurance", type: "MGA", location: "Calgary, AB", primary_lines: ["Recreational","Affinity","Specialty Auto"], min_premium: 40000, max_limit: 6000000, appetite: "Aggressive" },
  { id: "17", name: "Wynward Specialty", type: "MGA", location: "Toronto, ON", primary_lines: ["Property","Casualty","Marine"], min_premium: 75000, max_limit: 11000000, appetite: "Moderate" },
  { id: "18", name: "Mosaic Insurance", type: "MGA", location: "Halifax, NS", primary_lines: ["Marine","Environmental","Aviation"], min_premium: 95000, max_limit: 9000000, appetite: "Selective" },
  { id: "19", name: "Volante Specialty", type: "MGA", location: "Montreal, QC", primary_lines: ["Casualty","D&O","Cyber"], min_premium: 110000, max_limit: 15000000, appetite: "Aggressive" },
  { id: "20", name: "Travelers Canada", type: "Insurer", location: "Toronto, ON", primary_lines: ["Commercial Property","Casualty","Management Liability"], min_premium: 45000, max_limit: 22000000, appetite: "Moderate" },
  { id: "21", name: "Munich Re Canada", type: "Insurer", location: "Toronto, ON", primary_lines: ["Reinsurance","Property","Casualty"], min_premium: 150000, max_limit: 50000000, appetite: "Selective" },
  { id: "22", name: "Intact Insurance", type: "Insurer", location: "Toronto, ON", primary_lines: ["Property","Casualty","Auto"], min_premium: 30000, max_limit: 18000000, appetite: "Moderate" },
  { id: "23", name: "Aviva Canada", type: "Insurer", location: "Toronto, ON", primary_lines: ["Commercial Property","Casualty","Financial Lines"], min_premium: 50000, max_limit: 20000000, appetite: "Moderate" },
  { id: "24", name: "Arch Underwriting", type: "MGA", location: "Vancouver, BC", primary_lines: ["Property","Casualty","Specialty Lines"], min_premium: 85000, max_limit: 17000000, appetite: "Aggressive" },
  { id: "25", name: "Pacific Specialty Underwriters", type: "MGA", location: "Vancouver, BC", primary_lines: ["Construction","Environmental","Professional Liability"], min_premium: 65000, max_limit: 10000000, appetite: "Moderate" },
  { id: "26", name: "Northway Specialty", type: "MGA", location: "Winnipeg, MB", primary_lines: ["Casualty","Specialty Auto","Management Liability"], min_premium: 55000, max_limit: 8500000, appetite: "Moderate" },
  { id: "27", name: "Alberta Risk Partners", type: "MGA", location: "Calgary, AB", primary_lines: ["Energy","Property","Casualty"], min_premium: 125000, max_limit: 18000000, appetite: "Selective" },
  { id: "28", name: "Eastern Specialty Group", type: "MGA", location: "Halifax, NS", primary_lines: ["Marine","Aviation","Professional Liability"], min_premium: 100000, max_limit: 12000000, appetite: "Moderate" },
  { id: "29", name: "Crawford & Company (Canada)", type: "MGA", location: "Toronto, ON", primary_lines: ["Claims Management","Specialty","Professional Services"], min_premium: 70000, max_limit: 14000000, appetite: "Moderate" },
  { id: "30", name: "Trafalgar Insurance Group", type: "Insurer", location: "Toronto, ON", primary_lines: ["Travel","Affinity","Specialty"], min_premium: 25000, max_limit: 5000000, appetite: "Aggressive" },
  { id: "31", name: "Centaur Insurance", type: "MGA", location: "Montreal, QC", primary_lines: ["D&O","E&O","Cyber"], min_premium: 95000, max_limit: 13000000, appetite: "Moderate" },
  { id: "32", name: "Westside Insurance Solutions", type: "MGA", location: "Vancouver, BC", primary_lines: ["Commercial Property","Casualty","Inland Marine"], min_premium: 60000, max_limit: 11000000, appetite: "Moderate" },
  { id: "33", name: "Great West Life (Specialty)", type: "Insurer", location: "Winnipeg, MB", primary_lines: ["Life Sciences","Healthcare","Professional Liability"], min_premium: 80000, max_limit: 16000000, appetite: "Selective" },
  { id: "34", name: "Onyx Specialty Underwriters", type: "MGA", location: "Toronto, ON", primary_lines: ["Cyber","Management Liability","Technology"], min_premium: 110000, max_limit: 12000000, appetite: "Aggressive" },
  { id: "35", name: "Pinnacle Specialty Insurance", type: "MGA", location: "Calgary, AB", primary_lines: ["Construction","Property","Environmental"], min_premium: 75000, max_limit: 14000000, appetite: "Moderate" },
  { id: "36", name: "Summit Risk Solutions", type: "MGA", location: "Toronto, ON", primary_lines: ["Professional Liability","D&O","Management Liability"], min_premium: 85000, max_limit: 10000000, appetite: "Moderate" },
  { id: "37", name: "Guardian Specialty Underwriting", type: "MGA", location: "Montreal, QC", primary_lines: ["Casualty","Property","Aviation"], min_premium: 70000, max_limit: 11000000, appetite: "Moderate" },
  { id: "38", name: "Chubb Canada", type: "Insurer", location: "Toronto, ON", primary_lines: ["Property","Casualty","Professional Liability"], min_premium: 100000, max_limit: 35000000, appetite: "Aggressive" },
  { id: "39", name: "XL Catlin Canada", type: "Insurer", location: "Toronto, ON", primary_lines: ["Property","Casualty","Specialty"], min_premium: 120000, max_limit: 40000000, appetite: "Moderate" },
  { id: "40", name: "Everest Insurance Canada", type: "Insurer", location: "Toronto, ON", primary_lines: ["Property","Casualty","Excess Liability"], min_premium: 90000, max_limit: 28000000, appetite: "Selective" },
  { id: "41", name: "Clearpoint Underwriting", type: "MGA", location: "Vancouver, BC", primary_lines: ["E&O","Professional Liability","Management Liability"], min_premium: 65000, max_limit: 9000000, appetite: "Aggressive" },
  { id: "42", name: "Apex Specialty Insurance", type: "MGA", location: "Toronto, ON", primary_lines: ["Construction","Environmental","Inland Marine"], min_premium: 80000, max_limit: 13000000, appetite: "Moderate" },
  { id: "43", name: "Catalyst Underwriting Group", type: "MGA", location: "Calgary, AB", primary_lines: ["Energy","Casualty","Property"], min_premium: 135000, max_limit: 19000000, appetite: "Selective" },
  { id: "44", name: "Beacon Risk Management", type: "MGA", location: "Halifax, NS", primary_lines: ["Marine","Property","Casualty"], min_premium: 85000, max_limit: 10000000, appetite: "Moderate" },
  { id: "45", name: "Vertex Insurance Solutions", type: "MGA", location: "Montreal, QC", primary_lines: ["Cyber","D&O","Technology"], min_premium: 120000, max_limit: 14000000, appetite: "Aggressive" },
  { id: "46", name: "Granite Specialty Underwriters", type: "MGA", location: "Toronto, ON", primary_lines: ["Professional Liability","Casualty","Management Liability"], min_premium: 70000, max_limit: 11000000, appetite: "Moderate" },
  { id: "47", name: "Orbit Insurance Partners", type: "MGA", location: "Vancouver, BC", primary_lines: ["Property","Marine","Environmental"], min_premium: 60000, max_limit: 12000000, appetite: "Moderate" },
  { id: "48", name: "Zenith Specialty Risk", type: "MGA", location: "Winnipeg, MB", primary_lines: ["Construction","Specialty Auto","Casualty"], min_premium: 50000, max_limit: 9000000, appetite: "Aggressive" },
  { id: "49", name: "Prime Insurance Group", type: "MGA", location: "Toronto, ON", primary_lines: ["Affinity","Recreational","Specialty"], min_premium: 40000, max_limit: 7000000, appetite: "Aggressive" },
  { id: "50", name: "Longitude Underwriting", type: "MGA", location: "Multi-province", primary_lines: ["Cyber","Management Liability","Professional Liability"], min_premium: 100000, max_limit: 15000000, appetite: "Moderate" },
];
