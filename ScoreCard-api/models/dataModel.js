class DataModel {
    constructor(
      week,
      deliveryAssociate,
      transporterID,
      overallStanding,
      deliveredPackages,
      keyFocusArea,
      onRoadSafetyScore,
      overallQualityScore,
      fico,
      acceleration,
      braking,
      cornering,
      distraction,
      seatBeltOffRate,
      speeding,
      speedingEventRate,
      distractionsRate,
      lookingAtPhone,
      talkingOnPhone,
      lookingDown,
      followingDistanceRate,
      signalViolationsRate,
      stopSignViolations,
      stopLightViolations,
      illegalUTurns,
      cdfDpmo,
      dcr,
      dsb,
      swcPOD,
      swcCC,
      swcAD,
      dnrs,
      shipmentsPerOnZoneHour,
      podOpps,
      ccOpps,
      customerEscalationDefect,
      customerDeliveryFeedback
    ) {
      this.week = week;
      this.deliveryAssociate = deliveryAssociate;
      this.transporterID = transporterID;
      this.overallStanding = overallStanding;
      this.deliveredPackages = deliveredPackages;
      this.keyFocusArea = keyFocusArea;
      this.onRoadSafetyScore = onRoadSafetyScore;
      this.overallQualityScore = overallQualityScore;
      this.fico = fico;
      this.acceleration = acceleration;
      this.braking = braking;
      this.cornering = cornering;
      this.distraction = distraction;
      this.seatBeltOffRate = seatBeltOffRate;
      this.speeding = speeding;
      this.speedingEventRate = speedingEventRate;
      this.distractionsRate = distractionsRate;
      this.lookingAtPhone = lookingAtPhone;
      this.talkingOnPhone = talkingOnPhone;
      this.lookingDown = lookingDown;
      this.followingDistanceRate = followingDistanceRate;
      this.signalViolationsRate = signalViolationsRate;
      this.stopSignViolations = stopSignViolations;
      this.stopLightViolations = stopLightViolations;
      this.illegalUTurns = illegalUTurns;
      this.cdfDpmo = cdfDpmo;
      this.dcr = dcr;
      this.dsb = dsb;
      this.swcPOD = swcPOD;
      this.swcCC = swcCC;
      this.swcAD = swcAD;
      this.dnrs = dnrs;
      this.shipmentsPerOnZoneHour = shipmentsPerOnZoneHour;
      this.podOpps = podOpps;
      this.ccOpps = ccOpps;
      this.customerEscalationDefect = customerEscalationDefect;
      this.customerDeliveryFeedback = customerDeliveryFeedback;
    }
  }
  
  module.exports = DataModel;
  