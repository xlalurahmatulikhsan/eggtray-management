import {
  calculateTeamAPay,
  calculateTeamBPay,
  distributeTeamAPay,
} from "./payroll.calculator.js";

const teamA = calculateTeamAPay({
  productionBundles: 141,
  pcsPerBundle: 50,
  pricePerPcs: 130,
  divisor: 5,
  fullWorkerCount: 4,
  halfWorkerCount: 2,
});

console.log("TEAM A");
console.log(teamA);

const teamB = calculateTeamBPay({
  dailyRate: 30000,
  presentCount: 6,
  replacementCount: 0,
});

console.log("TEAM B");
console.log(teamB);

const distribution = distributeTeamAPay(teamA.baseAmount, [
  {
    employeeId: "employee-1",
    isHalfPay: false,
  },
  {
    employeeId: "employee-2",
    isHalfPay: false,
  },
  {
    employeeId: "employee-3",
    isHalfPay: false,
  },
  {
    employeeId: "employee-4",
    isHalfPay: false,
  },
  {
    employeeId: "employee-5",
    isHalfPay: true,
  },
  {
    employeeId: "employee-6",
    isHalfPay: true,
  },
]);

console.log("DISTRIBUTION");
console.log(distribution);
