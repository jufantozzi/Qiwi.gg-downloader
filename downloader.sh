#!/bin/bash

# Input file containing a list of links and filenames (one per line)
input_file="links.txt"

# Check if the input file exists
if [ ! -f "$input_file" ]; then
  echo "The input file $input_file does not exist."
  exit 1
fi

# Function to download a single link with a specified file name
download_link() {
  link="$1"
  filename="$2"
  wget "$link" -O "$filename"
}

# Loop through each line in the file, split the link and filename, and download in parallel
while read -r line; do
  # Use 'awk' to split the line into link and filename
  link=$(echo "$line" | awk -F',' '{print $1}')
  filename=$(echo "$line" | awk -F',' '{print $2}')
  
  # Download the file with the specified filename
  download_link "$link" "$filename" &
done < "$input_file"

# Wait for all background jobs to finish
wait

# Remove the input file and the script itself
rm "$input_file"
rm "$0"