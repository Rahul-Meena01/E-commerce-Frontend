import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown } from "lucide-react";
import API from "../utils/api";

export default function SearchableDropdown({
  value,
  onChange,
  fetchUrl,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchOptions = async (query = "") => {
    setLoading(true);
    try {
      const separator = fetchUrl.includes("?") ? "&" : "?";
      const url = `${fetchUrl}${separator}q=${query}&limit=5`;
      
      const data = await API(url);
      if (data && data.success) {
        setOptions(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching options:", error.message || error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (isOpen) {
        fetchOptions(search);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt._id === value) || (value ? { _id: value, name: "Selected Option" } : null);

  const styles = {
    container: { position: "relative", width: "100%", fontFamily: "'Outfit', sans-serif" },
    selectBox: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      padding: "10px 16px",
      backgroundColor: "#ffffff",
      border: "1px solid #cbd5e1",
      borderRadius: "10px",
      cursor: "pointer",
      transition: "all 0.2s ease",
      boxSizing: "border-box",
      boxShadow: isOpen ? "0 0 0 2px rgba(99, 102, 241, 0.2)" : "none",
      borderColor: isOpen ? "#6366f1" : "#cbd5e1",
    },
    selectText: {
      color: selectedOption ? "#1e293b" : "#94a3b8",
      fontSize: "14px",
      fontWeight: "500",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    dropdown: {
      position: "absolute",
      zIndex: 50,
      width: "100%",
      marginTop: "8px",
      backgroundColor: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
      overflow: "hidden",
      animation: "fadeIn 0.2s ease-out",
    },
    searchInputWrapper: {
      position: "relative",
      padding: "12px",
      borderBottom: "1px solid #f1f5f9",
      backgroundColor: "#f8fafc",
    },
    searchInput: {
      width: "100%",
      padding: "10px 12px 10px 36px",
      backgroundColor: "#ffffff",
      border: "1px solid #cbd5e1",
      borderRadius: "8px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
      transition: "border-color 0.2s ease",
    },
    searchIcon: {
      position: "absolute",
      left: "24px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#94a3b8",
    },
    optionsList: {
      maxHeight: "220px",
      overflowY: "auto",
      padding: "8px",
    },
    option: (isSelected) => ({
      padding: "10px 14px",
      fontSize: "14px",
      borderRadius: "8px",
      cursor: "pointer",
      transition: "all 0.15s ease",
      display: "flex",
      alignItems: "center",
      backgroundColor: isSelected ? "#eef2ff" : "transparent",
      color: isSelected ? "#4f46e5" : "#334155",
      fontWeight: isSelected ? "600" : "400",
    }),
    loadingOrEmpty: {
      padding: "16px",
      textAlign: "center",
      fontSize: "14px",
      color: "#64748b",
    }
  };

  return (
    <div style={styles.container} ref={dropdownRef}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .searchable-option:hover {
          background-color: #f1f5f9;
        }
        .searchable-input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2) !important;
        }
      `}</style>

      <div style={styles.selectBox} onClick={() => setIsOpen(!isOpen)}>
        <span style={styles.selectText}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown size={18} color={isOpen ? "#6366f1" : "#64748b"} />
      </div>

      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.searchInputWrapper}>
            <Search size={16} style={styles.searchIcon} />
            <input
              type="text"
              className="searchable-input"
              style={styles.searchInput}
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div style={styles.optionsList}>
            {loading ? (
              <div style={styles.loadingOrEmpty}>Loading...</div>
            ) : options.length > 0 ? (
              options.map((option) => (
                <div
                  key={option._id}
                  className={value === option._id ? "" : "searchable-option"}
                  style={styles.option(value === option._id)}
                  onClick={() => {
                    onChange(option._id);
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  {option.name}
                </div>
              ))
            ) : (
              <div style={styles.loadingOrEmpty}>No results found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
