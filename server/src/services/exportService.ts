/**
 * Export Service - Generates Excel files for performance data
 */

import * as XLSX from 'xlsx';
import { createRequire } from 'module';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type PdfPrinterType from 'pdfmake/src/printer.js';

const require = createRequire(import.meta.url);
const PdfPrinter = require('pdfmake/src/printer') as typeof PdfPrinterType;
import { User } from '../models/User';
import { Team } from '../models/Team';

interface DimensionScores {
  functional: number;
  organizational: number;
  selfDevelopment: number;
  developingOthers: number;
}

interface EmployeeExportData {
  department: string;
  name: string;
  designation: string;
  r1Scores: DimensionScores;
  r2Scores: DimensionScores;
  r3Scores: DimensionScores;
  r4Scores: DimensionScores;
  total: number;
  average: number;
}

/**
 * Calculate dimension score for a specific review period
 */
function calculateDimensionScoreForPeriod(
  kras: any[],
  period: 'r1' | 'r2' | 'r3' | 'r4'
): number {
  if (!kras || kras.length === 0) return 0;

  const scores: number[] = [];
  for (const kra of kras) {
    const score = kra[`${period}Score`];
    if (score !== undefined && score !== null && !isNaN(score) && score >= 0) {
      scores.push(score);
    }
  }

  if (scores.length === 0) return 0;
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(average * 10) / 10; // Round to 1 decimal place
}

/**
 * Get all users in organization with their performance data
 */
export async function getOrganizationExportData(
  organizationId: string
): Promise<EmployeeExportData[]> {
  // Get all users in organization
  const allUsers = await User.find({
    organizationId,
    role: { $in: ['boss', 'manager', 'employee'] },
  });

  const exportData: EmployeeExportData[] = [];

  // Get all teams for these users
  const userIds = allUsers.map((u) => u._id);
  const teams = await Team.find({
    $or: [
      { createdBy: { $in: userIds } },
      { members: { $in: userIds } },
    ],
  });

  // Process each user
  for (const user of allUsers) {
    // Find team for this user - check teamId first, then createdBy, then members
    let userTeam;
    if (user.teamId) {
      userTeam = teams.find((t) => t._id.toString() === user.teamId?.toString());
    }
    if (!userTeam) {
      userTeam = teams.find(
        (t) =>
          t.createdBy?.toString() === user._id.toString() ||
          t.members.some((m) => m.toString() === user._id.toString())
      );
    }

    if (!userTeam) continue;

    // Find member details
    const memberDetails = userTeam.membersDetails.find(
      (m: any) => m.mobile === user.mobile
    );

    if (!memberDetails) continue;

    // Calculate dimension scores for each period
    const r1Scores: DimensionScores = {
      functional: calculateDimensionScoreForPeriod(
        memberDetails.functionalKRAs || [],
        'r1'
      ),
      organizational: calculateDimensionScoreForPeriod(
        memberDetails.organizationalKRAs || [],
        'r1'
      ),
      selfDevelopment: calculateDimensionScoreForPeriod(
        memberDetails.selfDevelopmentKRAs || [],
        'r1'
      ),
      developingOthers: calculateDimensionScoreForPeriod(
        memberDetails.developingOthersKRAs || [],
        'r1'
      ),
    };

    const r2Scores: DimensionScores = {
      functional: calculateDimensionScoreForPeriod(
        memberDetails.functionalKRAs || [],
        'r2'
      ),
      organizational: calculateDimensionScoreForPeriod(
        memberDetails.organizationalKRAs || [],
        'r2'
      ),
      selfDevelopment: calculateDimensionScoreForPeriod(
        memberDetails.selfDevelopmentKRAs || [],
        'r2'
      ),
      developingOthers: calculateDimensionScoreForPeriod(
        memberDetails.developingOthersKRAs || [],
        'r2'
      ),
    };

    const r3Scores: DimensionScores = {
      functional: calculateDimensionScoreForPeriod(
        memberDetails.functionalKRAs || [],
        'r3'
      ),
      organizational: calculateDimensionScoreForPeriod(
        memberDetails.organizationalKRAs || [],
        'r3'
      ),
      selfDevelopment: calculateDimensionScoreForPeriod(
        memberDetails.selfDevelopmentKRAs || [],
        'r3'
      ),
      developingOthers: calculateDimensionScoreForPeriod(
        memberDetails.developingOthersKRAs || [],
        'r3'
      ),
    };

    const r4Scores: DimensionScores = {
      functional: calculateDimensionScoreForPeriod(
        memberDetails.functionalKRAs || [],
        'r4'
      ),
      organizational: calculateDimensionScoreForPeriod(
        memberDetails.organizationalKRAs || [],
        'r4'
      ),
      selfDevelopment: calculateDimensionScoreForPeriod(
        memberDetails.selfDevelopmentKRAs || [],
        'r4'
      ),
      developingOthers: calculateDimensionScoreForPeriod(
        memberDetails.developingOthersKRAs || [],
        'r4'
      ),
    };

    // Calculate average score for each review period (average of 4 dimensions)
    const r1Average = (r1Scores.functional + r1Scores.organizational + r1Scores.selfDevelopment + r1Scores.developingOthers) / 4;
    const r2Average = (r2Scores.functional + r2Scores.organizational + r2Scores.selfDevelopment + r2Scores.developingOthers) / 4;
    const r3Average = (r3Scores.functional + r3Scores.organizational + r3Scores.selfDevelopment + r3Scores.developingOthers) / 4;
    const r4Average = (r4Scores.functional + r4Scores.organizational + r4Scores.selfDevelopment + r4Scores.developingOthers) / 4;

    // Collect period averages that have data
    const periodAverages: number[] = [];
    if (r1Scores.functional > 0 || r1Scores.organizational > 0 || r1Scores.selfDevelopment > 0 || r1Scores.developingOthers > 0) {
      periodAverages.push(r1Average);
    }
    if (r2Scores.functional > 0 || r2Scores.organizational > 0 || r2Scores.selfDevelopment > 0 || r2Scores.developingOthers > 0) {
      periodAverages.push(r2Average);
    }
    if (r3Scores.functional > 0 || r3Scores.organizational > 0 || r3Scores.selfDevelopment > 0 || r3Scores.developingOthers > 0) {
      periodAverages.push(r3Average);
    }
    if (r4Scores.functional > 0 || r4Scores.organizational > 0 || r4Scores.selfDevelopment > 0 || r4Scores.developingOthers > 0) {
      periodAverages.push(r4Average);
    }

    // Calculate total (sum of all dimension scores across all periods)
    const total =
      r1Scores.functional +
      r1Scores.organizational +
      r1Scores.selfDevelopment +
      r1Scores.developingOthers +
      r2Scores.functional +
      r2Scores.organizational +
      r2Scores.selfDevelopment +
      r2Scores.developingOthers +
      r3Scores.functional +
      r3Scores.organizational +
      r3Scores.selfDevelopment +
      r3Scores.developingOthers +
      r4Scores.functional +
      r4Scores.organizational +
      r4Scores.selfDevelopment +
      r4Scores.developingOthers;

    // Calculate average as the average of the 4 review period averages
    const average = periodAverages.length > 0 
      ? Math.round((periodAverages.reduce((a, b) => a + b, 0) / periodAverages.length) * 10) / 10 
      : 0;

    // Get designation (capitalize role)
    const designation =
      user.role.charAt(0).toUpperCase() + user.role.slice(1);

    exportData.push({
      department: userTeam.name || '',
      name: user.name,
      designation,
      r1Scores,
      r2Scores,
      r3Scores,
      r4Scores,
      total,
      average,
    });
  }

  return exportData;
}

/**
 * Generate Excel file buffer from export data
 */
export function generateExcelFile(data: EmployeeExportData[]): Buffer {
  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Create worksheet data
  const worksheetData: any[][] = [];

  // Row 7: Main headers
  worksheetData.push([]); // Row 1-6 empty
  worksheetData.push([]);
  worksheetData.push([]);
  worksheetData.push([]);
  worksheetData.push([]);
  worksheetData.push([]);
  const headerRow7 = [
    'Department',
    'Name of Employee',
    'Designation',
    'R1 Score',
    '',
    '',
    '',
    'R2 Score',
    '',
    '',
    '',
    'R3 Score',
    '',
    '',
    '',
    'R4 Score',
    '',
    '',
    '',
    'Total',
    'Average',
    'Gross salary',
    'Net Salary',
    'Hike Percentage',
    'Hike in Amount',
  ];
  worksheetData.push(headerRow7);

  // Row 8: Sub-headers for dimensions
  const headerRow8 = [
    '',
    '',
    '',
    'Functional',
    'Organizational',
    'Self Development',
    'Developing Others',
    'Functional',
    'Organizational',
    'Self Development',
    'Developing Others',
    'Functional',
    'Organizational',
    'Self Development',
    'Developing Others',
    'Functional',
    'Organizational',
    'Self Development',
    'Developing Others',
    '',
    '',
    '',
    '',
    '',
    '',
  ];
  worksheetData.push(headerRow8);

  // Helper function to format score to 1 decimal place
  const formatScore = (score: number | ''): number | '' => {
    if (score === '' || score === 0) return '';
    return Math.round(score * 10) / 10;
  };

  // Data rows
  for (const employee of data) {
    const row = [
      employee.department,
      employee.name,
      employee.designation,
      formatScore(employee.r1Scores.functional),
      formatScore(employee.r1Scores.organizational),
      formatScore(employee.r1Scores.selfDevelopment),
      formatScore(employee.r1Scores.developingOthers),
      formatScore(employee.r2Scores.functional),
      formatScore(employee.r2Scores.organizational),
      formatScore(employee.r2Scores.selfDevelopment),
      formatScore(employee.r2Scores.developingOthers),
      formatScore(employee.r3Scores.functional),
      formatScore(employee.r3Scores.organizational),
      formatScore(employee.r3Scores.selfDevelopment),
      formatScore(employee.r3Scores.developingOthers),
      formatScore(employee.r4Scores.functional),
      formatScore(employee.r4Scores.organizational),
      formatScore(employee.r4Scores.selfDevelopment),
      formatScore(employee.r4Scores.developingOthers),
      formatScore(employee.total),
      formatScore(employee.average),
      '', // Gross salary
      '', // Net Salary
      '', // Hike Percentage
      '', // Hike in Amount
    ];
    worksheetData.push(row);
  }

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Merge cells for period headers (Row 7)
  worksheet['!merges'] = [
    { s: { r: 6, c: 3 }, e: { r: 6, c: 6 } }, // R1 Score (D7:G7)
    { s: { r: 6, c: 7 }, e: { r: 6, c: 10 } }, // R2 Score (H7:K7)
    { s: { r: 6, c: 11 }, e: { r: 6, c: 14 } }, // R3 Score (L7:O7)
    { s: { r: 6, c: 15 }, e: { r: 6, c: 18 } }, // R4 Score (P7:S7)
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Performance Appraisal Sheet');

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return buffer;
}

/**
 * Generate PDF file buffer from export data
 */
export function generatePDFFile(data: EmployeeExportData[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Define fonts (using default fonts)
      const fonts = {
        Roboto: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique',
        },
      };

      const printer = new PdfPrinter(fonts);

      // Helper function to format score to 1 decimal place
      const formatScore = (score: number | ''): string => {
        if (score === '' || score === 0) return '';
        return (Math.round(score * 10) / 10).toString();
      };

      // Build table body
      const tableBody: any[] = [
        // Header row 1 (merged cells simulated with colspan)
        [
          { text: 'Department', style: 'tableHeader', rowSpan: 2 },
          { text: 'Name of Employee', style: 'tableHeader', rowSpan: 2 },
          { text: 'Designation', style: 'tableHeader', rowSpan: 2 },
          { text: 'R1 Score', style: 'tableHeader', colSpan: 4, alignment: 'center' },
          {},
          {},
          {},
          { text: 'R2 Score', style: 'tableHeader', colSpan: 4, alignment: 'center' },
          {},
          {},
          {},
          { text: 'R3 Score', style: 'tableHeader', colSpan: 4, alignment: 'center' },
          {},
          {},
          {},
          { text: 'R4 Score', style: 'tableHeader', colSpan: 4, alignment: 'center' },
          {},
          {},
          {},
          { text: 'Total', style: 'tableHeader', rowSpan: 2 },
          { text: 'Average', style: 'tableHeader', rowSpan: 2 },
          { text: 'Gross salary', style: 'tableHeader', rowSpan: 2 },
          { text: 'Net Salary', style: 'tableHeader', rowSpan: 2 },
          { text: 'Hike Percentage', style: 'tableHeader', rowSpan: 2 },
          { text: 'Hike in Amount', style: 'tableHeader', rowSpan: 2 },
        ],
        // Header row 2 (sub-headers)
        // Note: First 3 empty objects are placeholders for rowSpan columns (Department, Name, Designation)
        // Last 6 empty objects are placeholders for rowSpan columns (Total, Average, Gross salary, Net Salary, Hike Percentage, Hike in Amount)
        [
          {}, // Placeholder for Department (rowSpan: 2)
          {}, // Placeholder for Name of Employee (rowSpan: 2)
          {}, // Placeholder for Designation (rowSpan: 2)
          { text: 'Functional', style: 'tableSubHeader' },
          { text: 'Organizational', style: 'tableSubHeader' },
          { text: 'Self Development', style: 'tableSubHeader' },
          { text: 'Developing Others', style: 'tableSubHeader' },
          { text: 'Functional', style: 'tableSubHeader' },
          { text: 'Organizational', style: 'tableSubHeader' },
          { text: 'Self Development', style: 'tableSubHeader' },
          { text: 'Developing Others', style: 'tableSubHeader' },
          { text: 'Functional', style: 'tableSubHeader' },
          { text: 'Organizational', style: 'tableSubHeader' },
          { text: 'Self Development', style: 'tableSubHeader' },
          { text: 'Developing Others', style: 'tableSubHeader' },
          { text: 'Functional', style: 'tableSubHeader' },
          { text: 'Organizational', style: 'tableSubHeader' },
          { text: 'Self Development', style: 'tableSubHeader' },
          { text: 'Developing Others', style: 'tableSubHeader' },
          {}, // Placeholder for Total (rowSpan: 2)
          {}, // Placeholder for Average (rowSpan: 2)
          {}, // Placeholder for Gross salary (rowSpan: 2)
          {}, // Placeholder for Net Salary (rowSpan: 2)
          {}, // Placeholder for Hike Percentage (rowSpan: 2)
          {}, // Placeholder for Hike in Amount (rowSpan: 2)
        ],
      ];

      // Add data rows
      for (const employee of data) {
        tableBody.push([
          { text: employee.department || '', style: 'tableCell' },
          { text: employee.name || '', style: 'tableCell' },
          { text: employee.designation || '', style: 'tableCell' },
          { text: formatScore(employee.r1Scores.functional), style: 'tableCell', alignment: 'center' },
          { text: formatScore(employee.r1Scores.organizational), style: 'tableCell', alignment: 'center' },
          { text: formatScore(employee.r1Scores.selfDevelopment), style: 'tableCell', alignment: 'center' },
          { text: formatScore(employee.r1Scores.developingOthers), style: 'tableCell', alignment: 'center' },
          { text: formatScore(employee.r2Scores.functional), style: 'tableCell', alignment: 'center' },
          { text: formatScore(employee.r2Scores.organizational), style: 'tableCell', alignment: 'center' },
          { text: formatScore(employee.r2Scores.selfDevelopment), style: 'tableCell', alignment: 'center' },
          { text: formatScore(employee.r2Scores.developingOthers), style: 'tableCell', alignment: 'center' },
          { text: formatScore(employee.r3Scores.functional), style: 'tableCell', alignment: 'center' },
          { text: formatScore(employee.r3Scores.organizational), style: 'tableCell', alignment: 'center' },
          { text: formatScore(employee.r3Scores.selfDevelopment), style: 'tableCell', alignment: 'center' },
          { text: formatScore(employee.r3Scores.developingOthers), style: 'tableCell', alignment: 'center' },
          { text: formatScore(employee.r4Scores.functional), style: 'tableCell', alignment: 'center' },
          { text: formatScore(employee.r4Scores.organizational), style: 'tableCell', alignment: 'center' },
          { text: formatScore(employee.r4Scores.selfDevelopment), style: 'tableCell', alignment: 'center' },
          { text: formatScore(employee.r4Scores.developingOthers), style: 'tableCell', alignment: 'center' },
          { text: formatScore(employee.total), style: 'tableCell', alignment: 'center' },
          { text: formatScore(employee.average), style: 'tableCell', alignment: 'center' },
          { text: '', style: 'tableCell' }, // Gross salary
          { text: '', style: 'tableCell' }, // Net Salary
          { text: '', style: 'tableCell' }, // Hike Percentage
          { text: '', style: 'tableCell' }, // Hike in Amount
        ]);
      }

      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [10, 30, 10, 30],
        content: [
          { text: 'Performance Appraisal Sheet', style: 'header', margin: [0, 0, 0, 20] },
          {
            table: {
              headerRows: 2,
              widths: [
                50, // Department
                70, // Name
                45, // Designation
                25, 25, 25, 25, // R1 (4 columns)
                25, 25, 25, 25, // R2 (4 columns)
                25, 25, 25, 25, // R3 (4 columns)
                25, 25, 25, 25, // R4 (4 columns)
                25, // Total
                25, // Average
                35, // Gross salary
                35, // Net Salary
                35, // Hike Percentage
                35, // Hike in Amount
              ],
              body: tableBody,
            },
            layout: {
              hLineWidth: (i: number, node: any) => {
                return i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5;
              },
              vLineWidth: () => 0.5,
              hLineColor: () => '#aaaaaa',
              vLineColor: () => '#aaaaaa',
              paddingLeft: () => 5,
              paddingRight: () => 5,
              paddingTop: () => 3,
              paddingBottom: () => 3,
            },
          },
        ],
        styles: {
          header: {
            fontSize: 18,
            bold: true,
            alignment: 'center',
          },
          tableHeader: {
            bold: true,
            fontSize: 8,
            color: 'black',
            fillColor: '#eeeeee',
            alignment: 'center',
          },
          tableSubHeader: {
            fontSize: 7,
            color: 'black',
            fillColor: '#f5f5f5',
            alignment: 'center',
          },
          tableCell: {
            fontSize: 7,
            color: 'black',
          },
        },
        defaultStyle: {
          fontSize: 7,
          font: 'Roboto',
        },
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];

      pdfDoc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      pdfDoc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });

      pdfDoc.on('error', (error: Error) => {
        reject(error);
      });

      pdfDoc.end();
    } catch (error) {
      reject(error);
    }
  });
}
