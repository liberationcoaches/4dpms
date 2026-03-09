/**
 * Export Service - Generates Excel files for performance data
 * Uses proper dimension weights for score calculation
 */

import * as XLSX from 'xlsx';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake/src/printer') as import('pdfmake/src/printer').default;
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Team, IDimensionWeights } from '../models/Team';
import {
  calculateMemberScores,
  calculateHikePercent,
  calculateSalaryHike,
  DEFAULT_DIMENSION_WEIGHTS,
  DEFAULT_HIKE_SLABS,
} from '../utils/calculations';

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
  r1FourDIndex: number;  // Weighted 4D Index for R1
  r2FourDIndex: number;  // Weighted 4D Index for R2
  r3FourDIndex: number;  // Weighted 4D Index for R3
  r4FourDIndex: number;  // Weighted 4D Index for R4
  total: number;
  average: number;       // Average 4D Index across periods
  grossSalary: number;
  netSalary: number;
  hikePercent: number;
  hikeAmount: number;
}

/**
 * Get personal performance data for a single user
 * Used for "Download My Report" feature
 */
export async function getPersonalExportData(
  userId: string
): Promise<EmployeeExportData | null> {
  const user = await User.findById(userId);
  if (!user) return null;

  // Get organization and its dimension weights
  const organization = user.organizationId 
    ? await Organization.findById(user.organizationId) 
    : null;
  const dimensionWeights: IDimensionWeights = organization?.dimensionWeights || DEFAULT_DIMENSION_WEIGHTS;

  // Get all teams this user might be in
  const teams = await Team.find({
    $or: [
      { createdBy: user._id },
      { members: user._id },
      { 'membersDetails.mobile': user.mobile },
    ],
  });

  // Find team and member details for this user
  let userTeam;
  let memberDetails;
  
  for (const team of teams) {
    memberDetails = team.membersDetails.find((m: any) => m.mobile === user.mobile);
    if (memberDetails) {
      userTeam = team;
      break;
    }
  }
  
  // Fallback: check by teamId or membership
  if (!userTeam) {
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
    if (userTeam) {
      memberDetails = userTeam.membersDetails.find((m: any) => m.mobile === user.mobile);
    }
  }

  if (!userTeam || !memberDetails) {
    // Return empty data for user without team
    const emptyScores: DimensionScores = {
      functional: 0,
      organizational: 0,
      selfDevelopment: 0,
      developingOthers: 0,
    };

    return {
      department: '',
      name: user.name,
      designation: user.role.charAt(0).toUpperCase() + user.role.slice(1),
      r1Scores: emptyScores,
      r2Scores: emptyScores,
      r3Scores: emptyScores,
      r4Scores: emptyScores,
      r1FourDIndex: 0,
      r2FourDIndex: 0,
      r3FourDIndex: 0,
      r4FourDIndex: 0,
      total: 0,
      average: 0,
      grossSalary: 0,
      netSalary: 0,
      hikePercent: 0,
      hikeAmount: 0,
    };
  }

  // Calculate dimension scores for each period using proper weighted calculation
  const memberKRAs = {
    functionalKRAs: memberDetails.functionalKRAs,
    organizationalKRAs: memberDetails.organizationalKRAs,
    selfDevelopmentKRAs: memberDetails.selfDevelopmentKRAs,
    developingOthersKRAs: memberDetails.developingOthersKRAs,
  };

  // Calculate per-period scores (includePilot doesn't affect single period calculations, but passing false for consistency)
  const r1Result = calculateMemberScores(memberKRAs, dimensionWeights, 1, false);
  const r2Result = calculateMemberScores(memberKRAs, dimensionWeights, 2, false);
  const r3Result = calculateMemberScores(memberKRAs, dimensionWeights, 3, false);
  const r4Result = calculateMemberScores(memberKRAs, dimensionWeights, 4, false);
  // Average calculation - Pilot NOT included per Excel verification
  const avgResult = calculateMemberScores(memberKRAs, dimensionWeights, 'average', false);

  const r1Scores: DimensionScores = {
    functional: r1Result.functional,
    organizational: r1Result.organizational,
    selfDevelopment: r1Result.selfDevelopment,
    developingOthers: r1Result.developingOthers,
  };

  const r2Scores: DimensionScores = {
    functional: r2Result.functional,
    organizational: r2Result.organizational,
    selfDevelopment: r2Result.selfDevelopment,
    developingOthers: r2Result.developingOthers,
  };

  const r3Scores: DimensionScores = {
    functional: r3Result.functional,
    organizational: r3Result.organizational,
    selfDevelopment: r3Result.selfDevelopment,
    developingOthers: r3Result.developingOthers,
  };

  const r4Scores: DimensionScores = {
    functional: r4Result.functional,
    organizational: r4Result.organizational,
    selfDevelopment: r4Result.selfDevelopment,
    developingOthers: r4Result.developingOthers,
  };

  // Calculate total (sum of 4D Indexes across all periods)
  const total = Math.round(
    (r1Result.fourDIndex + r2Result.fourDIndex + r3Result.fourDIndex + r4Result.fourDIndex) * 10
  ) / 10;

  // Average 4D Index across all periods
  const average = avgResult.fourDIndex;

  // Calculate salary hike based on 4D Index using user profile salary (fallback to 0)
  const grossSalary = Number(user.grossSalary) || 0;
  const hikePercent = calculateHikePercent(average, DEFAULT_HIKE_SLABS);
  const salaryDetails = calculateSalaryHike(grossSalary, average, DEFAULT_HIKE_SLABS);

  // Get designation (capitalize role)
  const designation = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  return {
    department: userTeam.name || '',
    name: user.name,
    designation,
    r1Scores,
    r2Scores,
    r3Scores,
    r4Scores,
    r1FourDIndex: r1Result.fourDIndex,
    r2FourDIndex: r2Result.fourDIndex,
    r3FourDIndex: r3Result.fourDIndex,
    r4FourDIndex: r4Result.fourDIndex,
    total,
    average,
    grossSalary,
    netSalary: salaryDetails.newSalary,
    hikePercent,
    hikeAmount: salaryDetails.hikeAmount,
  };
}

/**
 * Get all users in organization with their performance data
 * Uses proper dimension weights for 4D Index calculation
 */
export async function getOrganizationExportData(
  organizationId: string
): Promise<EmployeeExportData[]> {
  // Get organization and its dimension weights
  const organization = await Organization.findById(organizationId);
  const dimensionWeights: IDimensionWeights = organization?.dimensionWeights || DEFAULT_DIMENSION_WEIGHTS;

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
      { 'membersDetails.mobile': { $in: allUsers.map((u) => u.mobile) } },
    ],
  });

  // Process each user
  for (const user of allUsers) {
    // Find team for this user - check membersDetails by mobile first
    let userTeam;
    let memberDetails;
    
    for (const team of teams) {
      memberDetails = team.membersDetails.find((m: any) => m.mobile === user.mobile);
      if (memberDetails) {
        userTeam = team;
        break;
      }
    }
    
    // Fallback: check by teamId or membership
    if (!userTeam) {
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
      if (userTeam) {
        memberDetails = userTeam.membersDetails.find((m: any) => m.mobile === user.mobile);
      }
    }

    if (!userTeam || !memberDetails) continue;

    // Calculate dimension scores for each period using proper weighted calculation
    const memberKRAs = {
      functionalKRAs: memberDetails.functionalKRAs,
      organizationalKRAs: memberDetails.organizationalKRAs,
      selfDevelopmentKRAs: memberDetails.selfDevelopmentKRAs,
      developingOthersKRAs: memberDetails.developingOthersKRAs,
    };

    // Calculate per-period scores (includePilot doesn't affect single period calculations, but passing false for consistency)
    const r1Result = calculateMemberScores(memberKRAs, dimensionWeights, 1, false);
    const r2Result = calculateMemberScores(memberKRAs, dimensionWeights, 2, false);
    const r3Result = calculateMemberScores(memberKRAs, dimensionWeights, 3, false);
    const r4Result = calculateMemberScores(memberKRAs, dimensionWeights, 4, false);
    // Average calculation - Pilot NOT included per Excel verification
    const avgResult = calculateMemberScores(memberKRAs, dimensionWeights, 'average', false);

    const r1Scores: DimensionScores = {
      functional: r1Result.functional,
      organizational: r1Result.organizational,
      selfDevelopment: r1Result.selfDevelopment,
      developingOthers: r1Result.developingOthers,
    };

    const r2Scores: DimensionScores = {
      functional: r2Result.functional,
      organizational: r2Result.organizational,
      selfDevelopment: r2Result.selfDevelopment,
      developingOthers: r2Result.developingOthers,
    };

    const r3Scores: DimensionScores = {
      functional: r3Result.functional,
      organizational: r3Result.organizational,
      selfDevelopment: r3Result.selfDevelopment,
      developingOthers: r3Result.developingOthers,
    };

    const r4Scores: DimensionScores = {
      functional: r4Result.functional,
      organizational: r4Result.organizational,
      selfDevelopment: r4Result.selfDevelopment,
      developingOthers: r4Result.developingOthers,
    };

    // Calculate total (sum of 4D Indexes across all periods)
    const total = Math.round(
      (r1Result.fourDIndex + r2Result.fourDIndex + r3Result.fourDIndex + r4Result.fourDIndex) * 10
    ) / 10;

    // Average 4D Index across all periods
    const average = avgResult.fourDIndex;

    // Calculate salary hike based on 4D Index using user profile salary (fallback to 0)
    const grossSalary = Number(user.grossSalary) || 0;
    const hikePercent = calculateHikePercent(average, DEFAULT_HIKE_SLABS);
    const salaryDetails = calculateSalaryHike(grossSalary, average, DEFAULT_HIKE_SLABS);

    // Get designation (capitalize role)
    const designation = user.role.charAt(0).toUpperCase() + user.role.slice(1);

    exportData.push({
      department: userTeam.name || '',
      name: user.name,
      designation,
      r1Scores,
      r2Scores,
      r3Scores,
      r4Scores,
      r1FourDIndex: r1Result.fourDIndex,
      r2FourDIndex: r2Result.fourDIndex,
      r3FourDIndex: r3Result.fourDIndex,
      r4FourDIndex: r4Result.fourDIndex,
      total,
      average,
      grossSalary,
      netSalary: salaryDetails.newSalary,
      hikePercent,
      hikeAmount: salaryDetails.hikeAmount,
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
      formatScore(employee.average), // 4D Index
      employee.grossSalary > 0 ? employee.grossSalary : '', // Gross salary
      employee.netSalary > 0 ? employee.netSalary : '', // Net Salary
      employee.hikePercent > 0 ? `${employee.hikePercent}%` : '', // Hike Percentage
      employee.hikeAmount > 0 ? employee.hikeAmount : '', // Hike in Amount
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
          { text: formatScore(employee.average), style: 'tableCell', alignment: 'center' }, // 4D Index
          { text: employee.grossSalary > 0 ? employee.grossSalary.toString() : '', style: 'tableCell', alignment: 'right' },
          { text: employee.netSalary > 0 ? employee.netSalary.toString() : '', style: 'tableCell', alignment: 'right' },
          { text: employee.hikePercent > 0 ? `${employee.hikePercent}%` : '', style: 'tableCell', alignment: 'center' },
          { text: employee.hikeAmount > 0 ? employee.hikeAmount.toString() : '', style: 'tableCell', alignment: 'right' },
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
