// Static /data.json fixture — OHM_DEMO(42), frozen. Regenerate:
//   node -e "global.window={};eval(require('fs').readFileSync('web/demo-data.js','utf8'));..."
// Exact embedded-server shape (Utilities/HttpServer.cs GenerateJSON).
window.OHM_FIXTURE = {
 "id": 0,
 "Text": "Sensor",
 "Children": [
  {
   "id": 2,
   "Text": "FORGE-01",
   "Children": [
    {
     "id": 14,
     "Text": "ASUS ROG STRIX B550-F",
     "Children": [
      {
       "id": 13,
       "Text": "Nuvoton NCT6798D",
       "Children": [
        {
         "id": 6,
         "Text": "Voltages",
         "Children": [
          {
           "id": 3,
           "Text": "CPU VCore",
           "Children": [],
           "Min": "0.900 V",
           "Value": "1.266 V",
           "Max": "1.450 V",
           "ImageURL": "images/transparent.png"
          },
          {
           "id": 4,
           "Text": "+3.3V",
           "Children": [],
           "Min": "3.280 V",
           "Value": "3.309 V",
           "Max": "3.340 V",
           "ImageURL": "images/transparent.png"
          },
          {
           "id": 5,
           "Text": "+12V",
           "Children": [],
           "Min": "11.980 V",
           "Value": "12.135 V",
           "Max": "12.190 V",
           "ImageURL": "images/transparent.png"
          }
         ],
         "Min": "",
         "Value": "",
         "Max": "",
         "ImageURL": "images_icon/voltage.png"
        },
        {
         "id": 9,
         "Text": "Temperatures",
         "Children": [
          {
           "id": 7,
           "Text": "System",
           "Children": [],
           "Min": "33.0 °C",
           "Value": "38.5 °C",
           "Max": "44.0 °C",
           "ImageURL": "images/transparent.png"
          },
          {
           "id": 8,
           "Text": "VRM",
           "Children": [],
           "Min": "41.0 °C",
           "Value": "50.0 °C",
           "Max": "68.0 °C",
           "ImageURL": "images/transparent.png"
          }
         ],
         "Min": "",
         "Value": "",
         "Max": "",
         "ImageURL": "images_icon/temperature.png"
        },
        {
         "id": 12,
         "Text": "Fans",
         "Children": [
          {
           "id": 10,
           "Text": "Chassis #1",
           "Children": [],
           "Min": "650 RPM",
           "Value": "822 RPM",
           "Max": "1,210 RPM",
           "ImageURL": "images/transparent.png"
          },
          {
           "id": 11,
           "Text": "Chassis #2",
           "Children": [],
           "Min": "620 RPM",
           "Value": "742 RPM",
           "Max": "1,150 RPM",
           "ImageURL": "images/transparent.png"
          }
         ],
         "Min": "",
         "Value": "",
         "Max": "",
         "ImageURL": "images_icon/fan.png"
        }
       ],
       "Min": "",
       "Value": "",
       "Max": "",
       "ImageURL": "images_icon/chip.png"
      }
     ],
     "Min": "",
     "Value": "",
     "Max": "",
     "ImageURL": "images_icon/mainboard.png"
    },
    {
     "id": 32,
     "Text": "AMD Ryzen 9 5950X",
     "Children": [
      {
       "id": 20,
       "Text": "Clocks",
       "Children": [
        {
         "id": 15,
         "Text": "Bus Speed",
         "Children": [],
         "Min": "99.6 MHz",
         "Value": "99.8 MHz",
         "Max": "100.0 MHz",
         "ImageURL": "images/transparent.png"
        },
        {
         "id": 16,
         "Text": "Core #1",
         "Children": [],
         "Min": "2200.0 MHz",
         "Value": "4832.7 MHz",
         "Max": "5030.0 MHz",
         "ImageURL": "images/transparent.png"
        },
        {
         "id": 17,
         "Text": "Core #2",
         "Children": [],
         "Min": "2200.0 MHz",
         "Value": "4466.2 MHz",
         "Max": "5030.0 MHz",
         "ImageURL": "images/transparent.png"
        },
        {
         "id": 18,
         "Text": "Core #3",
         "Children": [],
         "Min": "2200.0 MHz",
         "Value": "3519.9 MHz",
         "Max": "4900.0 MHz",
         "ImageURL": "images/transparent.png"
        },
        {
         "id": 19,
         "Text": "Core #4",
         "Children": [],
         "Min": "2200.0 MHz",
         "Value": "3955.6 MHz",
         "Max": "4900.0 MHz",
         "ImageURL": "images/transparent.png"
        }
       ],
       "Min": "",
       "Value": "",
       "Max": "",
       "ImageURL": "images_icon/clock.png"
      },
      {
       "id": 24,
       "Text": "Temperatures",
       "Children": [
        {
         "id": 21,
         "Text": "Core (Tctl/Tdie)",
         "Children": [],
         "Min": "38.0 °C",
         "Value": "65.9 °C",
         "Max": "84.0 °C",
         "ImageURL": "images/transparent.png"
        },
        {
         "id": 22,
         "Text": "CCD1",
         "Children": [],
         "Min": "36.0 °C",
         "Value": "56.1 °C",
         "Max": "79.0 °C",
         "ImageURL": "images/transparent.png"
        },
        {
         "id": 23,
         "Text": "CCD2",
         "Children": [],
         "Min": "35.0 °C",
         "Value": "53.0 °C",
         "Max": "77.0 °C",
         "ImageURL": "images/transparent.png"
        }
       ],
       "Min": "",
       "Value": "",
       "Max": "",
       "ImageURL": "images_icon/temperature.png"
      },
      {
       "id": 28,
       "Text": "Load",
       "Children": [
        {
         "id": 25,
         "Text": "CPU Total",
         "Children": [],
         "Min": "2.0 %",
         "Value": "42.0 %",
         "Max": "100.0 %",
         "ImageURL": "images/transparent.png"
        },
        {
         "id": 26,
         "Text": "CPU Core #1",
         "Children": [],
         "Min": "1.0 %",
         "Value": "74.3 %",
         "Max": "100.0 %",
         "ImageURL": "images/transparent.png"
        },
        {
         "id": 27,
         "Text": "CPU Core #2",
         "Children": [],
         "Min": "1.0 %",
         "Value": "53.5 %",
         "Max": "100.0 %",
         "ImageURL": "images/transparent.png"
        }
       ],
       "Min": "",
       "Value": "",
       "Max": "",
       "ImageURL": "images_icon/load.png"
      },
      {
       "id": 31,
       "Text": "Powers",
       "Children": [
        {
         "id": 29,
         "Text": "CPU Package",
         "Children": [],
         "Min": "21.0 W",
         "Value": "68.2 W",
         "Max": "142.0 W",
         "ImageURL": "images/transparent.png"
        },
        {
         "id": 30,
         "Text": "CPU Cores",
         "Children": [],
         "Min": "12.0 W",
         "Value": "69.9 W",
         "Max": "121.0 W",
         "ImageURL": "images/transparent.png"
        }
       ],
       "Min": "",
       "Value": "",
       "Max": "",
       "ImageURL": "images_icon/power.png"
      }
     ],
     "Min": "",
     "Value": "",
     "Max": "",
     "ImageURL": "images_icon/cpu.png"
    },
    {
     "id": 38,
     "Text": "Generic Memory",
     "Children": [
      {
       "id": 34,
       "Text": "Load",
       "Children": [
        {
         "id": 33,
         "Text": "Memory",
         "Children": [],
         "Min": "31.0 %",
         "Value": "56.0 %",
         "Max": "78.0 %",
         "ImageURL": "images/transparent.png"
        }
       ],
       "Min": "",
       "Value": "",
       "Max": "",
       "ImageURL": "images_icon/load.png"
      },
      {
       "id": 37,
       "Text": "Data",
       "Children": [
        {
         "id": 35,
         "Text": "Used Memory",
         "Children": [],
         "Min": "9.8 GB",
         "Value": "16.5 GB",
         "Max": "24.9 GB",
         "ImageURL": "images/transparent.png"
        },
        {
         "id": 36,
         "Text": "Available Memory",
         "Children": [],
         "Min": "7.0 GB",
         "Value": "14.7 GB",
         "Max": "22.1 GB",
         "ImageURL": "images/transparent.png"
        }
       ],
       "Min": "",
       "Value": "",
       "Max": "",
       "ImageURL": "images_icon/hdd.png"
      }
     ],
     "Min": "",
     "Value": "",
     "Max": "",
     "ImageURL": "images_icon/ram.png"
    },
    {
     "id": 51,
     "Text": "NVIDIA GeForce RTX 3080",
     "Children": [
      {
       "id": 41,
       "Text": "Clocks",
       "Children": [
        {
         "id": 39,
         "Text": "GPU Core",
         "Children": [],
         "Min": "210.0 MHz",
         "Value": "1627.6 MHz",
         "Max": "1995.0 MHz",
         "ImageURL": "images/transparent.png"
        },
        {
         "id": 40,
         "Text": "GPU Memory",
         "Children": [],
         "Min": "405.0 MHz",
         "Value": "9251.0 MHz",
         "Max": "9251.0 MHz",
         "ImageURL": "images/transparent.png"
        }
       ],
       "Min": "",
       "Value": "",
       "Max": "",
       "ImageURL": "images_icon/clock.png"
      },
      {
       "id": 43,
       "Text": "Temperatures",
       "Children": [
        {
         "id": 42,
         "Text": "GPU Core",
         "Children": [],
         "Min": "34.0 °C",
         "Value": "66.6 °C",
         "Max": "83.0 °C",
         "ImageURL": "images/transparent.png"
        }
       ],
       "Min": "",
       "Value": "",
       "Max": "",
       "ImageURL": "images_icon/temperature.png"
      },
      {
       "id": 46,
       "Text": "Load",
       "Children": [
        {
         "id": 44,
         "Text": "GPU Core",
         "Children": [],
         "Min": "0.0 %",
         "Value": "63.4 %",
         "Max": "100.0 %",
         "ImageURL": "images/transparent.png"
        },
        {
         "id": 45,
         "Text": "GPU Memory",
         "Children": [],
         "Min": "4.0 %",
         "Value": "66.7 %",
         "Max": "88.0 %",
         "ImageURL": "images/transparent.png"
        }
       ],
       "Min": "",
       "Value": "",
       "Max": "",
       "ImageURL": "images_icon/load.png"
      },
      {
       "id": 48,
       "Text": "Fans",
       "Children": [
        {
         "id": 47,
         "Text": "GPU",
         "Children": [],
         "Min": "0 RPM",
         "Value": "1,659 RPM",
         "Max": "2,820 RPM",
         "ImageURL": "images/transparent.png"
        }
       ],
       "Min": "",
       "Value": "",
       "Max": "",
       "ImageURL": "images_icon/fan.png"
      },
      {
       "id": 50,
       "Text": "Powers",
       "Children": [
        {
         "id": 49,
         "Text": "GPU Power",
         "Children": [],
         "Min": "18.0 W",
         "Value": "210.2 W",
         "Max": "334.0 W",
         "ImageURL": "images/transparent.png"
        }
       ],
       "Min": "",
       "Value": "",
       "Max": "",
       "ImageURL": "images_icon/power.png"
      }
     ],
     "Min": "",
     "Value": "",
     "Max": "",
     "ImageURL": "images_icon/nvidia.png"
    },
    {
     "id": 56,
     "Text": "Samsung SSD 980 PRO 1TB",
     "Children": [
      {
       "id": 53,
       "Text": "Temperatures",
       "Children": [
        {
         "id": 52,
         "Text": "Temperature",
         "Children": [],
         "Min": "31.0 °C",
         "Value": "42.7 °C",
         "Max": "56.0 °C",
         "ImageURL": "images/transparent.png"
        }
       ],
       "Min": "",
       "Value": "",
       "Max": "",
       "ImageURL": "images_icon/temperature.png"
      },
      {
       "id": 55,
       "Text": "Load",
       "Children": [
        {
         "id": 54,
         "Text": "Used Space",
         "Children": [],
         "Min": "67.4 %",
         "Value": "67.4 %",
         "Max": "67.4 %",
         "ImageURL": "images/transparent.png"
        }
       ],
       "Min": "",
       "Value": "",
       "Max": "",
       "ImageURL": "images_icon/load.png"
      }
     ],
     "Min": "",
     "Value": "",
     "Max": "",
     "ImageURL": "images_icon/hdd.png"
    }
   ],
   "Min": "",
   "Value": "",
   "Max": "",
   "ImageURL": "images_icon/computer.png"
  }
 ],
 "Min": "Min",
 "Value": "Value",
 "Max": "Max",
 "ImageURL": ""
};
