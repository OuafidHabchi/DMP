const express = require("express");
const router = express.Router();
const getDatabaseConnection = require("../utils/database");
const getDynamicModel = require("../utils/dynamicModel");

function optimizeShiftAssignments(requiredShiftsPerDay, finalPredictions, missingShiftsPerDay, shiftDetails) {
  let updatedPredictions = [...finalPredictions];
  let updatedMissingShifts = JSON.parse(JSON.stringify(missingShiftsPerDay));

  // 🔹 Suivi des heures travaillées et des shifts acceptés
  let weeklyHours = {};
  let employeeShifts = {}; // Stocke les shifts acceptés par employé

  // 📌 Initialiser les heures travaillées et les shifts par employé
  updatedPredictions.forEach(pred => {
    const shiftDuration = shiftDetails[pred.shiftId]?.duration || 0;

    if (!weeklyHours[pred.employeeId]) weeklyHours[pred.employeeId] = 0;
    if (!employeeShifts[pred.employeeId]) employeeShifts[pred.employeeId] = [];

    if (pred.status === "accepted") {
      weeklyHours[pred.employeeId] += shiftDuration;
      employeeShifts[pred.employeeId].push({
        selectedDay: pred.selectedDay,
        shiftId: pred.shiftId,
        shiftDuration: shiftDuration,
        predId: pred._id
      });
    }
  });

  // 🔹 Fonction pour vérifier si un employé peut accepter un shift sans dépasser 40h
  const canAcceptShift = (employeeId, shiftDuration) => {
    return (weeklyHours[employeeId] || 0) + shiftDuration <= 40;
  };

  // 🔹 Étape 1 : Parcourir les shifts manquants et essayer de combler avec des shifts refusés
  for (let day in updatedMissingShifts) {
    for (let missingShift of updatedMissingShifts[day]) {
      if (missingShift.missing > 0) {
        let shiftId = missingShift.shiftId;

        // Trouver tous les employés ayant une disponibilité refusée pour ce shift
        let rejectedCandidates = updatedPredictions.filter(pred =>
          pred.selectedDay === day &&
          pred.shiftId === shiftId &&
          pred.status === "rejected"
        );

        // Trier les candidats en priorité par nombre d'heures travaillées (favoriser ceux qui ont le moins d'heures)
        rejectedCandidates.sort((a, b) => (weeklyHours[a.employeeId] || 0) - (weeklyHours[b.employeeId] || 0));

        for (let candidate of rejectedCandidates) {
          if (missingShift.missing <= 0) break; // Arrêter si le manque est comblé

          const shiftDuration = shiftDetails[candidate.shiftId]?.duration || 0;

          // 🔴 Si l'employé peut accepter directement ce shift sans dépasser 40h, on l'accepte
          if (canAcceptShift(candidate.employeeId, shiftDuration)) {
            updatedPredictions = updatedPredictions.map(pred =>
              pred._id === candidate._id ? { ...pred, status: "accepted", reason: "Accepted to fill missing shift" } : pred
            );

            weeklyHours[candidate.employeeId] += shiftDuration;
            missingShift.missing -= 1;

            // Ajouter le shift à la liste des shifts acceptés
            employeeShifts[candidate.employeeId].push({
              selectedDay: candidate.selectedDay,
              shiftId: candidate.shiftId,
              shiftDuration: shiftDuration,
              predId: candidate._id
            });

          } else {
            // 🔴 Si l'employé dépasse 40h, on cherche un shift à retirer pour lui permettre de prendre ce shift

            let possibleShiftToRemove = employeeShifts[candidate.employeeId].find(shift =>
              shift.selectedDay !== candidate.selectedDay // On ne doit pas créer de vide dans la même journée
            );

            if (possibleShiftToRemove) {
              // 🔹 Trouver un remplaçant pour le shift qui va être retiré
              let replacementCandidate = updatedPredictions.find(pred =>
                pred.selectedDay === possibleShiftToRemove.selectedDay &&
                pred.shiftId === possibleShiftToRemove.shiftId &&
                pred.status === "rejected" &&
                canAcceptShift(pred.employeeId, possibleShiftToRemove.shiftDuration)
              );

              if (replacementCandidate) {
                // ✅ Accepter la dispo du remplaçant
                updatedPredictions = updatedPredictions.map(pred =>
                  pred._id === replacementCandidate._id ? { ...pred, status: "accepted", reason: "Accepted as replacement" } : pred
                );

                weeklyHours[replacementCandidate.employeeId] += possibleShiftToRemove.shiftDuration;

                // ✅ Retirer le shift existant pour accepter le nouveau
                updatedPredictions = updatedPredictions.map(pred =>
                  pred._id === possibleShiftToRemove.predId ? { ...pred, status: "rejected", reason: "Removed to optimize schedule" } : pred
                );

                weeklyHours[candidate.employeeId] -= possibleShiftToRemove.shiftDuration;

                // ✅ Accepter maintenant le nouveau shift
                updatedPredictions = updatedPredictions.map(pred =>
                  pred._id === candidate._id ? { ...pred, status: "accepted", reason: "Accepted after shift swap" } : pred
                );

                weeklyHours[candidate.employeeId] += shiftDuration;
                missingShift.missing -= 1;

                // 🔹 Mise à jour des shifts acceptés
                employeeShifts[candidate.employeeId] = employeeShifts[candidate.employeeId].filter(
                  shift => shift.predId !== possibleShiftToRemove.predId
                );

                employeeShifts[candidate.employeeId].push({
                  selectedDay: candidate.selectedDay,
                  shiftId: candidate.shiftId,
                  shiftDuration: shiftDuration,
                  predId: candidate._id
                });

                employeeShifts[replacementCandidate.employeeId].push({
                  selectedDay: possibleShiftToRemove.selectedDay,
                  shiftId: possibleShiftToRemove.shiftId,
                  shiftDuration: possibleShiftToRemove.shiftDuration,
                  predId: replacementCandidate._id
                });
              }
            }
          }
        }
      }
    }
  }

  // 🔹 Mise à jour des shifts manquants après optimisation
  let correctedMissingShifts = {};

  Object.entries(requiredShiftsPerDay).forEach(([day, shiftsNeeded]) => {
    Object.entries(shiftsNeeded).forEach(([shiftId, { needed }]) => {
      let acceptedForShift = updatedPredictions.filter(p =>
        p.selectedDay === day && p.shiftId === shiftId && p.status === "accepted"
      ).length;

      let missing = needed - acceptedForShift;

      if (missing > 0) {
        if (!correctedMissingShifts[day]) correctedMissingShifts[day] = [];
        correctedMissingShifts[day].push({
          shiftId: shiftId,
          needed: needed,
          accepted: acceptedForShift,
          missing: missing
        });
      }
    });
  });

  updatedMissingShifts = correctedMissingShifts;

  return { updatedPredictions, updatedMissingShifts };
}





router.post("/predict-shifts", async (req, res) => {
  try {
    const { dsp_code, weekRange, requiredShiftsPerDay, optimization } = req.body;
    if (!dsp_code || !weekRange || !requiredShiftsPerDay) {
      return res.status(500).json({ message: "❌ Missing required parameters." });
    }
    const connection = await getDatabaseConnection(dsp_code);
    const Disponibilite = getDynamicModel(connection, "Disponibilite", require("../Disponibiltes-api/models/disponibilite"));
    const Employee = getDynamicModel(connection, "Employee", require("../Employes-api/models/Employee"));
    const Shift = getDynamicModel(connection, "Shift", require("../Shifts-api/models/shift"));
    const TimeCard = getDynamicModel(connection, "TimeCard", require("../TimeCard-api/models/TimeCard"));

    const requestedDates = Object.keys(requiredShiftsPerDay);
    const disponibilites = await Disponibilite.find({ selectedDay: { $in: requestedDates } });

    if (disponibilites.length === 0) {
      return res.status(200).json({ message: "ℹ️ Aucune disponibilité trouvée pour cette semaine.", predictions: [] });
    }

    // Récupérer les détails des shifts
    const shiftIds = [...new Set(disponibilites.map((d) => d.shiftId))];
    const shifts = await Shift.find({ _id: { $in: shiftIds } });

    const shiftDetails = {};
    shifts.forEach((shift) => {
      const startTime = parseInt(shift.starttime.split(":")[0], 10) * 60 + parseInt(shift.starttime.split(":")[1], 10);
      const endTime = parseInt(shift.endtime.split(":")[0], 10) * 60 + parseInt(shift.endtime.split(":")[1], 10);
      let duration = (endTime - startTime) / 60;

      // Retirer 30 minutes si le shift dure plus de 5 heures
      if (duration > 5) {
        duration -= 0.5;
      }

      shiftDetails[shift._id] = {
        name: shift.name,
        color: shift.color,
        duration
      };
    });
    // console.log("shiftDetails:", JSON.stringify(shiftDetails, null, 2));


    // Récupérer les employés concernés
    const employeeIds = [...new Set(disponibilites.map((d) => d.employeeId))];
    let employees = await Employee.find({ _id: { $in: employeeIds } });

    const scorePriority = { Fantastic: 1, Great: 2, Fair: 3, Poor: 4, "New DA": 5 };
    employees = employees.sort((a, b) => (scorePriority[a.scoreCard] || 6) - (scorePriority[b.scoreCard] || 6));

    const employeeDetails = Object.fromEntries(employees.map(emp => [emp._id, emp]));



    // Récupérer la performance des employés sur leurs derniers shifts (max 10)
    const employeePerformance = {}; // Stocke les performances des employés

    for (const employeeId of employeeIds) {
      const lastTimeCards = await TimeCard.find({ employeeId }).sort({ day: -1 }).limit(10);
      let overLimitCount = 0;
      let totalCount = lastTimeCards.length; // Nombre de shifts réellement disponibles

      if (totalCount === 0) {
        // Si l'employé n'a aucun shift enregistré, on le considère comme performant
        employeePerformance[employeeId] = {
          isLowPerformance: false,
          overrunPercentage: "0.00" // 0% de dépassement
        };
        continue;
      }

      lastTimeCards.forEach(({ startTime, endTime, CortexDuree }) => {

        if (!startTime || !endTime) {
          return; // Passe à la prochaine TimeCard
        }
        const start = parseInt(startTime.split(":")[0], 10) * 60 + parseInt(startTime.split(":")[1], 10);
        const end = parseInt(endTime.split(":")[0], 10) * 60 + parseInt(endTime.split(":")[1], 10);
        let workedHours = (end - start) / 60;

        if (workedHours > 5) {
          workedHours -= 0.5; // Retirer 30 min si > 5h
        }

        // Définir la limite de performance basée sur CortexDuree
        const cortexLimit = parseFloat(CortexDuree) > 5 ? parseFloat(CortexDuree) + 1 : parseFloat(CortexDuree);

        if (workedHours > cortexLimit) {
          overLimitCount++;
        }
      });

      // Ajustement du seuil en fonction du nombre de shifts disponibles
      const performanceThreshold = totalCount >= 10 ? 0.6 : 0.4; // 60% si 10 shifts, 40% si moins
      const overrunPercentage = ((overLimitCount / totalCount) * 100).toFixed(2); // Stocke le % de dépassement

      // L'employé est considéré comme moins performant s'il dépasse la limite trop souvent
      employeePerformance[employeeId] = {
        isLowPerformance: (overLimitCount / totalCount) > performanceThreshold,
        overrunPercentage: overrunPercentage
      };
    }


    // Récupérer les heures travaillées la semaine en cours
    const timeCardsCurrentWeek = await TimeCard.find({
      day: { $gte: weekRange.start, $lte: weekRange.end },
      employeeId: { $in: employeeIds }
    });

    const hoursWorkedCurrentWeek = {};
    const shiftsAssignedCurrentWeek = {}; // Compteur des shifts assignés par employé

    timeCardsCurrentWeek.forEach(({ employeeId, startTime, endTime }) => {
      const start = parseInt(startTime.split(":")[0], 10) * 60 + parseInt(startTime.split(":")[1], 10);
      const end = parseInt(endTime.split(":")[0], 10) * 60 + parseInt(endTime.split(":")[1], 10);
      let workedHours = (end - start) / 60;

      if (workedHours > 5) {
        workedHours -= 0.5; // Retirer 30 min si le shift dépasse 5h
      }

      hoursWorkedCurrentWeek[employeeId] = (hoursWorkedCurrentWeek[employeeId] || 0) + workedHours;
      shiftsAssignedCurrentWeek[employeeId] = (shiftsAssignedCurrentWeek[employeeId] || 0) + 1;
    });

    // Traitement des disponibilités et attribution des shifts
    let finalPredictions = [];
    let shiftsAcceptedPerEmployee = {}; // Stocke le nombre de shifts acceptés par employé
    let missingShiftsPerDay = {}; // Stocke les jours avec un manque d'employés
    let temporarilyRejected = {}; // Stocker les refus temporaires



    Object.entries(requiredShiftsPerDay).forEach(([day, shiftsNeeded]) => {
      let dailyDisponibilites = disponibilites.filter((d) => d.selectedDay === day);
      // Trier les disponibilités par priorité de score
      dailyDisponibilites.sort((a, b) => (scorePriority[employeeDetails[a.employeeId]?.scoreCard] || 6) - (scorePriority[employeeDetails[b.employeeId]?.scoreCard] || 6));
      Object.entries(shiftsNeeded).forEach(([shiftId, { needed, extra }]) => {
        let maxEmployees = needed + extra;
        let accepted = 0;

        dailyDisponibilites.forEach((dispo) => {
          if (dispo.shiftId !== shiftId) return;

          const employee = employeeDetails[dispo.employeeId];
          const shiftDuration = shiftDetails[shiftId]?.duration || 0;
          const totalHoursIfAccepted = (hoursWorkedCurrentWeek[dispo.employeeId] || 0) + shiftDuration;
          const totalShiftsIfAccepted = (shiftsAssignedCurrentWeek[dispo.employeeId] || 0) + 1;



          // Vérifier si l'employé a une performance faible et rejeter immédiatement ses disponibilités
          if (employeePerformance[dispo.employeeId]?.isLowPerformance === true) {
            finalPredictions.push({
              ...dispo.toObject(),
              status: "rejected",
              reason: `Low performance: ${employeePerformance[dispo.employeeId].overrunPercentage}% exceeded estimated time (Cortex Duree)`
            });
            return;
          }

          if (totalHoursIfAccepted > 40) {
            finalPredictions.push({
              ...dispo.toObject(),
              status: "rejected",
              reason: "Maximum weekly hours exceeded"
            });
            return;
          }

          if (totalShiftsIfAccepted > 5) {
            finalPredictions.push({
              ...dispo.toObject(),
              status: "rejected",
              reason: "Maximum weekly shifts exceeded"
            });
            return;
          }

          if (accepted < maxEmployees) {
            finalPredictions.push({
              ...dispo.toObject(),
              status: "accepted",
              hoursWorked: hoursWorkedCurrentWeek[dispo.employeeId] || 0, // Ajouter les heures travaillées
              shiftDuration: shiftDetails[shiftId]?.duration || 0 // Ajouter la durée du shift
            });

            // Mettre à jour les heures travaillées
            hoursWorkedCurrentWeek[dispo.employeeId] = totalHoursIfAccepted;
            shiftsAssignedCurrentWeek[dispo.employeeId] = totalShiftsIfAccepted;
            accepted++;
          } else {
            finalPredictions.push({
              ...dispo.toObject(),
              status: "rejected",
              reason: "Shift limit reached",
              hoursWorked: hoursWorkedCurrentWeek[dispo.employeeId] || 0, // Ajouter les heures travaillées
              shiftDuration: shiftDetails[shiftId]?.duration || 0 // Ajouter la durée du shift
            });
          }
        });

        // 🔍 Vérification du manque de personnel pour ce shift
        let acceptedForShift = finalPredictions.filter(p => p.selectedDay === day && p.shiftId === shiftId && p.status === "accepted").length;
        let missing = needed - acceptedForShift; // Calcul du manque

        if (missing > 0) {
          if (!missingShiftsPerDay[day]) {
            missingShiftsPerDay[day] = [];
          }
          missingShiftsPerDay[day].push({
            shiftId: shiftId,
            needed: needed, // Besoin initial
            accepted: acceptedForShift, // Nombre réellement accepté
            missing: missing // Manque réel
          });
        }

      });
    }

    );

    // 🔹 Stocker les disponibilités refusées
    const rejectedDisponibilities = {};

    finalPredictions.forEach((prediction) => {
      if (prediction.status === "rejected") {
        if (!rejectedDisponibilities[prediction.selectedDay]) {
          rejectedDisponibilities[prediction.selectedDay] = [];
        }
        rejectedDisponibilities[prediction.selectedDay].push(prediction);
      }
    });



    if (optimization) {
      const optimizedResults = optimizeShiftAssignments(
        requiredShiftsPerDay,
        finalPredictions,
        missingShiftsPerDay,
        shiftDetails // Passer shiftDetails à la fonction d'optimisation
      );
      finalPredictions = optimizedResults.updatedPredictions;
      missingShiftsPerDay = optimizedResults.updatedMissingShifts;

    }
    res.status(200).json({
      message: "Predictions generated",
      predictions: finalPredictions,
      missingShifts: missingShiftsPerDay
    });


  }

  catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }

});

module.exports = router;
