//
//  HealthKitService.swift
//  LifeLogAI
//
//  Integrates with Apple HealthKit to read:
//  - Step count
//  - Walking/running distance
//  - Sleep analysis
//  - Active energy burned
//
//  SETUP IN XCODE:
//  1. Select your target → Signing & Capabilities
//  2. Click "+ Capability" → Add "HealthKit"
//  3. In Info.plist, add these keys:
//     - NSHealthShareUsageDescription: "LifeLog AI reads your health data to track fitness and sleep"
//     - NSHealthUpdateUsageDescription: "LifeLog AI may write activity data"
//

import Foundation
import HealthKit

class HealthKitService {
    static let shared = HealthKitService()
    
    private let healthStore = HKHealthStore()
    private let calendar = Calendar.current
    
    private init() {}
    
    // MARK: - Availability
    
    /// Check if HealthKit is available on this device
    var isAvailable: Bool {
        HKHealthStore.isHealthDataAvailable()
    }
    
    // MARK: - Authorization
    
    /// Request permission to read health data
    func requestAuthorization() async -> Bool {
        guard isAvailable else {
            print("HealthKit is not available on this device")
            return false
        }
        
        // Define the types we want to read
        let typesToRead: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .stepCount)!,
            HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!
        ]
        
        do {
            try await healthStore.requestAuthorization(toShare: [], read: typesToRead)
            return true
        } catch {
            print("HealthKit authorization failed: \(error)")
            return false
        }
    }
    
    /// Check if we have authorization for a specific type
    func isAuthorized(for type: HKObjectType) -> Bool {
        let status = healthStore.authorizationStatus(for: type)
        return status == .sharingAuthorized
    }
    
    // MARK: - Step Count
    
    /// Get step count for today
    func getStepsToday() async -> Int {
        await getSteps(for: Date())
    }
    
    /// Get step count for a specific date
    func getSteps(for date: Date) async -> Int {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            return 0
        }
        
        let startOfDay = calendar.startOfDay(for: date)
        let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay)!
        
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: endOfDay, options: .strictStartDate)
        
        return await withCheckedContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: stepType,
                quantitySamplePredicate: predicate,
                options: .cumulativeSum
            ) { _, result, error in
                if let error = error {
                    print("Steps query error: \(error)")
                    continuation.resume(returning: 0)
                    return
                }
                
                let steps = result?.sumQuantity()?.doubleValue(for: .count()) ?? 0
                continuation.resume(returning: Int(steps))
            }
            
            healthStore.execute(query)
        }
    }
    
    /// Get steps for the last 7 days
    func getStepsForWeek() async -> [(date: Date, steps: Int)] {
        var results: [(Date, Int)] = []
        
        for i in 0..<7 {
            let date = calendar.date(byAdding: .day, value: -i, to: Date())!
            let steps = await getSteps(for: date)
            results.append((date, steps))
        }
        
        return results.reversed()
    }
    
    // MARK: - Distance
    
    /// Get walking/running distance for today (in kilometers)
    func getDistanceToday() async -> Double {
        await getDistance(for: Date())
    }
    
    /// Get distance for a specific date
    func getDistance(for date: Date) async -> Double {
        guard let distanceType = HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning) else {
            return 0
        }
        
        let startOfDay = calendar.startOfDay(for: date)
        let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay)!
        
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: endOfDay, options: .strictStartDate)
        
        return await withCheckedContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: distanceType,
                quantitySamplePredicate: predicate,
                options: .cumulativeSum
            ) { _, result, error in
                if let error = error {
                    print("Distance query error: \(error)")
                    continuation.resume(returning: 0)
                    return
                }
                
                let meters = result?.sumQuantity()?.doubleValue(for: .meter()) ?? 0
                let km = meters / 1000
                continuation.resume(returning: km)
            }
            
            healthStore.execute(query)
        }
    }
    
    // MARK: - Sleep
    
    /// Get sleep hours for last night
    func getSleepHoursLastNight() async -> Double {
        guard let sleepType = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) else {
            return 0
        }
        
        // Look for sleep between yesterday 6 PM and today noon
        let now = Date()
        let yesterday = calendar.date(byAdding: .day, value: -1, to: now)!
        var startComponents = calendar.dateComponents([.year, .month, .day], from: yesterday)
        startComponents.hour = 18 // 6 PM yesterday
        let startDate = calendar.date(from: startComponents)!
        
        var endComponents = calendar.dateComponents([.year, .month, .day], from: now)
        endComponents.hour = 12 // 12 PM today
        let endDate = calendar.date(from: endComponents)!
        
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        
        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: sleepType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: nil
            ) { _, samples, error in
                if let error = error {
                    print("Sleep query error: \(error)")
                    continuation.resume(returning: 0)
                    return
                }
                
                guard let sleepSamples = samples as? [HKCategorySample] else {
                    continuation.resume(returning: 0)
                    return
                }
                
                // Sum up all asleep time
                var totalSeconds: Double = 0
                for sample in sleepSamples {
                    // Only count actual sleep (not "in bed")
                    if sample.value == HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue ||
                       sample.value == HKCategoryValueSleepAnalysis.asleepCore.rawValue ||
                       sample.value == HKCategoryValueSleepAnalysis.asleepDeep.rawValue ||
                       sample.value == HKCategoryValueSleepAnalysis.asleepREM.rawValue {
                        totalSeconds += sample.endDate.timeIntervalSince(sample.startDate)
                    }
                }
                
                let hours = totalSeconds / 3600
                continuation.resume(returning: hours)
            }
            
            healthStore.execute(query)
        }
    }
    
    // MARK: - Active Calories
    
    /// Get active calories burned today
    func getActiveCaloriesToday() async -> Int {
        guard let calorieType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) else {
            return 0
        }
        
        let startOfDay = calendar.startOfDay(for: Date())
        let now = Date()
        
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)
        
        return await withCheckedContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: calorieType,
                quantitySamplePredicate: predicate,
                options: .cumulativeSum
            ) { _, result, error in
                if let error = error {
                    print("Calories query error: \(error)")
                    continuation.resume(returning: 0)
                    return
                }
                
                let calories = result?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
                continuation.resume(returning: Int(calories))
            }
            
            healthStore.execute(query)
        }
    }
    
    // MARK: - Aggregated Data
    
    /// Get all health data for today
    func getTodayData() async -> HealthData {
        async let steps = getStepsToday()
        async let distance = getDistanceToday()
        async let sleep = getSleepHoursLastNight()
        async let calories = getActiveCaloriesToday()
        
        return await HealthData(
            steps: steps,
            distanceKm: distance,
            sleepHours: sleep,
            activeCalories: calories
        )
    }
}

// MARK: - Health Data Model

struct HealthData {
    let steps: Int
    let distanceKm: Double
    let sleepHours: Double
    let activeCalories: Int
    
    var formattedSteps: String {
        steps.formatted()
    }
    
    var formattedDistance: String {
        String(format: "%.1f km", distanceKm)
    }
    
    var formattedSleep: String {
        String(format: "%.1f hours", sleepHours)
    }
}
