var app = angular.module('viewDiaryApp', []);

app.controller('ViewController', function($scope, $http) {
    
    // ==========================================
    // CONFIGURATION: YOUR GOOGLE SHEET CSV LINK
    // ==========================================
     var googleSheetCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTVlG3VWvzvOzwo36khFV8DA-GoDYSidPBo2i8YWvraDM3eQSkegVaz39x-8Qa4W8Fzf5-raMnSUauM/pub?gid=588909063&single=true&output=csv';
    var registryCsvUrl = 'YOUR_NEW_STANDALONE_REGISTRY_CSV_LINK_HERE';
    // ==========================================

    $scope.isLoggedIn = false;
    $scope.isLoading = false;
    $scope.currentView = 'menu'; // Views: 'menu', 'date', 'teacher', 'class'
    $scope.loginData = { username: '', password: '' };
    
    $scope.allEntries = [];
    $scope.uniqueDates = [];
    $scope.uniqueTeachers = [];
    $scope.uniqueClasses = [];
    
    $scope.selectedDate = '';
    $scope.pickerDate = null;
    $scope.filteredDateEntries = [];
    
    $scope.searchTarget = { teacherName: '', className: '' };
    $scope.teacherTimelineResults = [];
    $scope.selectedTeacherQuery = '';
    
    $scope.classTrackerResults = [];
    $scope.selectedClassQuery = '';
    
    $scope.activeModalEntry = {};

    $scope.login = function() {
        if ($scope.loginData.username === 'Principal' && $scope.loginData.password === 'Admin123') {
            $scope.isLoggedIn = true;
            $scope.fetchLiveData();
        } else {
            alert("Please enter valid admin credentials.");
        }
    };

    $scope.logout = function() {
        $scope.isLoggedIn = false;
        $scope.loginData = { username: '', password: '' };
    };

    $scope.changeView = function(viewName) {
        $scope.currentView = viewName;
    };

    // Helper: Deduplicate dataset so only the LATEST submission per Teacher + Date remains
    function getDeduplicatedEntries(rawEntries) {
        var map = {};
        rawEntries.forEach(function(row) {
            var teacher = row['Teacher Name'] ? row['Teacher Name'].trim() : '';
            var date = row['Date'] ? row['Date'].trim() : '';
            if (teacher && date) {
                var uniqueKey = teacher + '___' + date;
                // Overwriting ensures the latest row (bottom of sheet) wins
                map[uniqueKey] = row; 
            }
        });
        return Object.values(map);
    }

    // Load main diary dataset
    $scope.fetchLiveData = function() {
        $scope.isLoading = true;
        $http.get(googleSheetCsvUrl)
            .then(function(response) {
                var parsedResult = Papa.parse(response.data, { header: true, skipEmptyLines: true });
                var rawData = parsedResult.data;
                
                // 1. Normalize field names
                rawData.forEach(function(row) {
                    row['Teacher Name'] = row['Teacher Name'] || row['entry.1416561559'];
                    row['Subject'] = row['Subject'] || row['entry.389868599'];
                    row['Date'] = row['Date'] || row['entry.1404280910'];
                    row['Status'] = row['Status'] || row['entry.1247247380'];
                    row['Classroom Records'] = row['Classroom Records'] || row['entry.1058626871'];
                    row['Topics Covered'] = row['Topics Covered'] || row['entry.1740253895'];
                    row['Remarks'] = row['Remarks'] || row['entry.699280446'];
                });

                // 2. DEDUPLICATE: Keep only latest entries per teacher per date
                $scope.allEntries = getDeduplicatedEntries(rawData);

                // 3. Extract Unique Dates in REVERSE order (Latest dates first)
                var rawDates = Array.from(new Set($scope.allEntries.map(e => e['Date']))).filter(Boolean);
                $scope.uniqueDates = rawDates.sort(function(a, b) {
                    var partsA = a.split('/');
                    var partsB = b.split('/');
                    var dateA = partsA.length === 3 ? new Date(partsA[2], partsA[1] - 1, partsA[0]) : new Date(a);
                    var dateB = partsB.length === 3 ? new Date(partsB[2], partsB[1] - 1, partsB[0]) : new Date(b);
                    return dateB - dateA;
                });

                // 4. Extract Unique Teachers
                $scope.uniqueTeachers = Array.from(new Set($scope.allEntries.map(e => e['Teacher Name']))).filter(Boolean);

                // Default to latest date view
                if ($scope.uniqueDates.length > 0) {
                    $scope.selectDate($scope.uniqueDates[0]);
                }

                $scope.isLoading = false;
            })
            .catch(function(err) {
                alert("Failed to load live diary records.");
                $scope.isLoading = false;
            });
    };

    // Date Selection Logic
   /* $scope.selectDate = function(targetDate) {
        $scope.selectedDate = targetDate;
        
        var parts = targetDate.split('/');
        if (parts.length === 3) {
            $scope.pickerDate = new Date(parts[2], parts[1] - 1, parts[0]);
        }
        
        $scope.filteredDateEntries = $scope.allEntries.filter(function(entry) {
            return entry['Date'] && entry['Date'].trim() === targetDate.trim();
        });
    };*/
/*$scope.selectDate = function(targetDate) {
    $scope.selectedDate = targetDate;
    
    // Parse DD/MM/YYYY back into Date object for input[type="date"]
    if (targetDate && targetDate.includes('/')) {
        var parts = targetDate.split('/');
        if (parts.length === 3) {
            $scope.pickerDate = new Date(parts[2], parts[1] - 1, parts[0]);
        }
    }
    
    // Filter deduplicated entries for selected date
    $scope.filteredDateEntries = $scope.allEntries.filter(function(entry) {
        return entry['Date'] && entry['Date'].trim() === targetDate.trim();
    });
};

    // Calendar Picker Change Handler
    /*$scope.onCalendarChange = function() {
        if ($scope.pickerDate) {
            var d = new Date($scope.pickerDate);
            var day = String(d.getDate()).padStart(2, '0');
            var month = String(d.getMonth() + 1).padStart(2, '0');
            var year = d.getFullYear();
            var formattedDate = day + '/' + month + '/' + year;

            $scope.selectDate(formattedDate);
        }
    };*/

    
// Handles user tapping a date on the calendar input
/*$scope.onCalendarChange = function() {
    if ($scope.pickerDate) {
        var d = new Date($scope.pickerDate);
        var day = String(d.getDate()).padStart(2, '0');
        var month = String(d.getMonth() + 1).padStart(2, '0');
        var year = d.getFullYear();
        
        // Format to match Google Sheet date string (DD/MM/YYYY)
        var formattedDate = day + '/' + month + '/' + year;
        
        $scope.selectDate(formattedDate);
    }
};*/

    // 1. Fixed Calendar Change Handler (Uses exact YYYY-MM-DD split to avoid timezone offsets)
/*$scope.onCalendarChange = function() {
    if ($scope.pickerDate) {
        // If pickerDate is a Date object, convert to YYYY-MM-DD string safely
        var dateStr = "";
        if ($scope.pickerDate instanceof Date) {
            var year = $scope.pickerDate.getFullYear();
            var month = String($scope.pickerDate.getMonth() + 1).padStart(2, '0');
            var day = String($scope.pickerDate.getDate()).padStart(2, '0');
            dateStr = year + "-" + month + "-" + day;
        } else {
            dateStr = String($scope.pickerDate);
        }

        var parts = dateStr.split('-'); // ["YYYY", "MM", "DD"]
        if (parts.length === 3) {
            var formattedDate = parts[2] + '/' + parts[1] + '/' + parts[0]; // "DD/MM/YYYY"
            $scope.selectDate(formattedDate);
        }
    }
};

// 2. Fixed Date Selection Logic
$scope.selectDate = function(targetDate) {
    $scope.selectedDate = targetDate;
    
    // Sync pickerDate without timezone shifts
    if (targetDate && targetDate.includes('/')) {
        var parts = targetDate.split('/'); // ["DD", "MM", "YYYY"]
        if (parts.length === 3) {
            // Setting year, monthIndex (0-based), day directly avoids UTC offset bugs
            $scope.pickerDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
    }
    
    // Filter deduplicated entries
    $scope.filteredDateEntries = $scope.allEntries.filter(function(entry) {
        return entry['Date'] && entry['Date'].trim() === targetDate.trim();
    });
};*/


  /*  // 1. Calendar Change Event Listener
$scope.onCalendarChange = function() {
    if (!$scope.pickerDate) return;

    var year, month, day;

    if ($scope.pickerDate instanceof Date) {
        year = $scope.pickerDate.getFullYear();
        month = String($scope.pickerDate.getMonth() + 1).padStart(2, '0');
        day = String($scope.pickerDate.getDate()).padStart(2, '0');
    } else {
        // If passed as string "YYYY-MM-DD"
        var strParts = String($scope.pickerDate).split('-');
        if (strParts.length === 3) {
            year = strParts[0];
            month = strParts[1];
            day = strParts[2];
        }
    }

    if (year && month && day) {
        var formattedDate = day + '/' + month + '/' + year; // Convert to "DD/MM/YYYY"
        
        // Directly update selectedDate and run filter
        $scope.selectedDate = formattedDate;
        $scope.filterEntriesByDate(formattedDate);
    }
};

// 2. Main Filter Function
$scope.filterEntriesByDate = function(targetDate) {
    $scope.selectedDate = targetDate;
    
    // Filter deduplicated records
    $scope.filteredDateEntries = $scope.allEntries.filter(function(entry) {
        return entry['Date'] && entry['Date'].trim() === targetDate.trim();
    });
};

// 3. Helper to Sync Default Date on Initial Load
$scope.selectDate = function(targetDate) {
    $scope.selectedDate = targetDate;
    
    // Convert "DD/MM/YYYY" to Date object for HTML5 input
    if (targetDate && targetDate.includes('/')) {
        var parts = targetDate.split('/');
        if (parts.length === 3) {
            $scope.pickerDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
    }
    
    $scope.filterEntriesByDate(targetDate);
};


$scope.applyCalendarDate = function() {
    if (!$scope.pickerDate) return;

    var year, month, day;

    if ($scope.pickerDate instanceof Date) {
        year = $scope.pickerDate.getFullYear();
        month = String($scope.pickerDate.getMonth() + 1).padStart(2, '0');
        day = String($scope.pickerDate.getDate()).padStart(2, '0');
    } else {
        var strParts = String($scope.pickerDate).split('-');
        if (strParts.length === 3) {
            year = strParts[0];
            month = strParts[1];
            day = strParts[2];
        }
    }

    if (year && month && day) {
        var formattedDate = day + '/' + month + '/' + year;
        $scope.selectDate(formattedDate);
    }
};_edited*/


    // Function triggered when the "OK" button is clicked
$scope.applyCalendarDate = function() {
    // Read raw value directly from the DOM input
    var dateVal = document.getElementById('adminDatePicker').value; // Returns "YYYY-MM-DD"
    
    if (!dateVal) {
        alert("Please tap on the box and pick a date first!");
        return;
    }

    // Split YYYY-MM-DD string
    var parts = dateVal.split('-'); 
    if (parts.length === 3) {
        var year = parts[0];
        var month = parts[1];
        var day = parts[2];

        // Format to DD/MM/YYYY to match Google Sheets format
        var formattedDate = day + '/' + month + '/' + year;

        // Force AngularJS to update the view digest cycle
        $scope.$applyAsync(function() {
            $scope.selectedDate = formattedDate;
            
            // Filter entries by formatted date
            $scope.filteredDateEntries = $scope.allEntries.filter(function(entry) {
                return entry['Date'] && entry['Date'].trim() === formattedDate.trim();
            });
        });
    }
};


// Main entry filter function
$scope.filterEntriesByDate = function(targetDate) {
    $scope.selectedDate = targetDate;
    
    // Filter deduplicated records
    $scope.filteredDateEntries = $scope.allEntries.filter(function(entry) {
        return entry['Date'] && entry['Date'].trim() === targetDate.trim();
    });
};

// Initial date setter on sheet load
$scope.selectDate = function(targetDate) {
    $scope.selectedDate = targetDate;
    
    // Set default value in the calendar picker
    if (targetDate && targetDate.includes('/')) {
        var parts = targetDate.split('/'); // ["DD", "MM", "YYYY"]
        if (parts.length === 3) {
            $scope.pickerDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
    }
    
    $scope.filterEntriesByDate(targetDate);
};



    
    // Teacher History Search Logic
    $scope.processTeacherQuery = function() {
        var query = $scope.searchTarget.teacherName ? $scope.searchTarget.teacherName.trim() : '';
        if (!query) return;
        
        $scope.selectedTeacherQuery = query;
        $scope.teacherTimelineResults = $scope.allEntries.filter(function(entry) {
            return entry['Teacher Name'] && entry['Teacher Name'].trim() === query;
        }).sort(function(a, b) {
            var partsA = a['Date'].split('/');
            var partsB = b['Date'].split('/');
            return new Date(partsB[2], partsB[1] - 1, partsB[0]) - new Date(partsA[2], partsA[1] - 1, partsA[0]);
        });
    };

    // Classroom Search Logic
    $scope.processClassQuery = function() {
        var targetClass = $scope.searchTarget.className;
        if (!targetClass) return;

        $scope.selectedClassQuery = targetClass;
        $scope.classTrackerResults = [];

        $scope.allEntries.forEach(function(entry) {
            if (entry['Classroom Records'] && (entry['Status'] === 'Present' || entry['Status'] === 'Half Day')) {
                var classLines = entry['Classroom Records'].split('\n');
                var topicLines = (entry['Topics Covered'] || '').split('\n');

                classLines.forEach(function(line, idx) {
                    if (line.includes(targetClass)) {
                        $scope.classTrackerResults.push({
                            date: entry['Date'],
                            teacher: entry['Teacher Name'],
                            subject: entry['Subject'],
                            lecNumber: idx + 1,
                            topics: topicLines[idx] || 'N/A'
                        });
                    }
                });
            }
        });
    };

    $scope.setActiveModalEntry = function(entry) {
        $scope.activeModalEntry = entry;
    };
});
