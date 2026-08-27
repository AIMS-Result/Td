var app = angular.module('summaryDiaryApp', []);

app.controller('SummaryController', function($scope, $http) {
    
    // =========================================================
    // CONFIGURATION LINKS
    // =========================================================
    var diaryCsvUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSf7RKtiK4aD2NnEgocCJ4pngXV4KuxXWoRD_CwJ3JoyW8h_MA/formResponse';
    var registryCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKsJnIL98uvAr-RpzFN8Ozx6H73IAqYqfLpSmI1hM5PzWCvpdMe9ZofWbmbmo8229Up044R3F6kcdm/pub?gid=0&single=true&output=csv';
    // =========================================================

    $scope.isLoading = true;
    $scope.registryTeachers = [];
    $scope.rawDiaryEntries = [];
    $scope.teacherStatusList = [];

    $scope.submittedCount = 0;
    $scope.pendingCount = 0;

    // Set Default Target Date to Today
    var today = new Date();
    $scope.pickerDate = today;
    
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var yyyy = today.getFullYear();
    $scope.selectedDate = dd + '/' + mm + '/' + yyyy;

    // Automatically load data on page open
    $scope.loadAllData = function() {
        $scope.isLoading = true;

        // Fetch Registry CSV
        $http.get(registryCsvUrl).then(function(regRes) {
            var parsedRegistry = Papa.parse(regRes.data, { header: true, skipEmptyLines: true });
            
            // Extract registered teacher names from Registry Sheet
            $scope.registryTeachers = parsedRegistry.data
                .map(row => row['Teacher Name'] || row['Name'] || row[Object.keys(row)[0]])
                .filter(Boolean);

            // Fetch Diary Entries CSV
            return $http.get(diaryCsvUrl);
        }).then(function(diaryRes) {
            var parsedDiary = Papa.parse(diaryRes.data, { header: true, skipEmptyLines: true });
            var rawData = parsedDiary.data;

            // Normalize Diary Columns
            rawData.forEach(function(row) {
               row['Teacher Name'] = row['Teacher Name'] || row['entry.1416561559'];
               row['Subject'] = row['Subject'] || row['entry.389868599'];
                row['Date'] = row['Date'] || row['entry.1404280910'];
                row['Status'] = row['Status'] || row['entry.1247247380'];
                row['Classroom Records'] = row['Classroom Records'] || row['entry.1058626871'];
                row['Topics Covered'] = row['Topics Covered'] || row['entry.1740253895'];
                row['Remarks'] = row['Remarks'] || row['entry.699280446'];
            });

            // Deduplicate: Keep latest entry per teacher per date
            var map = {};
            rawData.forEach(function(row) {
                var t = row['Teacher Name'] ? row['Teacher Name'].trim() : '';
                var d = row['Date'] ? row['Date'].trim() : '';
                if (t && d) {
                    map[t + '___' + d] = row;
                }
            });
            $scope.rawDiaryEntries = Object.values(map);

            // Evaluate comparison for default selected date (Today)
            $scope.evaluateStatusForDate($scope.selectedDate);

            $scope.isLoading = false;
        }).catch(function(err) {
            alert("Error loading databases. Check your CSV URL configurations.");
            $scope.isLoading = false;
        });
    };

    // Date Picker Change Handler via DOM / OK button
    $scope.applyDateChange = function() {
        var dateVal = document.getElementById('summaryDatePicker').value; // Returns YYYY-MM-DD
        if (!dateVal) {
            alert("Please pick a valid date!");
            return;
        }

        var parts = dateVal.split('-'); // ["YYYY", "MM", "DD"]
        if (parts.length === 3) {
            var formattedDate = parts[2] + '/' + parts[1] + '/' + parts[0]; // Convert to DD/MM/YYYY
            $scope.selectedDate = formattedDate;
            $scope.evaluateStatusForDate(formattedDate);
        }
    };

    // Match Registry against Diary Submissions for target date
    $scope.evaluateStatusForDate = function(targetDate) {
        // Filter diary records matching the target date
        var targetDateEntries = $scope.rawDiaryEntries.filter(function(entry) {
            return entry['Date'] && entry['Date'].trim() === targetDate.trim();
        });

        $scope.submittedCount = 0;
        $scope.pendingCount = 0;

        // Map through all registered teachers
        $scope.teacherStatusList = $scope.registryTeachers.map(function(teacherName) {
            var match = targetDateEntries.find(function(entry) {
                return entry['Teacher Name'] && entry['Teacher Name'].trim() === teacherName.trim();
            });

            if (match) {
                $scope.submittedCount++;
                return { name: teacherName, hasSubmitted: true, entry: match };
            } else {
                $scope.pendingCount++;
                return { name: teacherName, hasSubmitted: false, entry: null };
            }
        });
    };

    // Trigger auto-fetch on load
    $scope.loadAllData();

});
